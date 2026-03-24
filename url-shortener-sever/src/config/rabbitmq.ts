import amqp from "amqplib";
import Url from "../models/Url";

let channel: amqp.Channel;

const QUEUE_NAME = "url_clicks_queue";

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const host = process.env.Rabbitmq_Host || "localhost";
    const user = process.env.Rabbitmq_Username || "guest";
    const pass = process.env.Rabbitmq_Password || "guest";

    const connectionUrl = `amqp://${user}:${pass}@${host}:5672`;

    const connection = await amqp.connect(connectionUrl);

    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log("Connected to RabbitMQ & Queue Asserted.");

    // Start the background consumer
    startClickBatchWorker();
  } catch (error) {
    console.error("RabbitMQ Connection Failed:", error);
  }
};

export const publishClickEvent = (shortCode: string): void => {
  if (!channel) {
    console.warn("RabbitMQ channel not initialized. Dropping click event.");
    return;
  }
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify({ shortCode })));
};

// Batch Worker Logic
const BATCH_SIZE = 10000;
const BATCH_TIMEOUT = 10000; // 10 seconds
let clickBatch: Record<string, number> = {};
let pendingMessages: amqp.Message[] = [];
let batchTimer: NodeJS.Timeout | null = null;

const flushBatchToDB = async () => {
  if (Object.keys(clickBatch).length === 0) return;

  const batchCopy = { ...clickBatch };
  const messagesToAck = [...pendingMessages];
  clickBatch = {};
  pendingMessages = [];

  try {
    const bulkOps = Object.entries(batchCopy).map(([shortCode, count]) => ({
      updateOne: {
        filter: { shortCode },
        update: { $inc: { clicks: count } },
      },
    }));

    if (bulkOps.length > 0) {
      await Url.bulkWrite(bulkOps);
      console.log(`Successfully synced ${bulkOps.length} URL click updates to MongoDB.`);
    }

    // Ack all messages only after successful DB write
    for (const msg of messagesToAck) {
      channel.ack(msg);
    }
  } catch (error) {
    console.error("Failed to sync clicks to MongoDB. Nacking messages for redelivery.", error);
    // Nack all messages so RabbitMQ redelivers them
    for (const msg of messagesToAck) {
      channel.nack(msg, false, true);
    }
  }
};

const startClickBatchWorker = () => {
  if (!channel) return;

  channel.consume(QUEUE_NAME, (msg) => {
    if (msg) {
      const { shortCode } = JSON.parse(msg.content.toString());

      // Aggregate in memory
      clickBatch[shortCode] = (clickBatch[shortCode] || 0) + 1;
      pendingMessages.push(msg);

      // Start the flush timer if not already running
      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          flushBatchToDB();
          batchTimer = null;
        }, BATCH_TIMEOUT);
      }

      // If we hit the max batch size, flush immediately
      if (Object.values(clickBatch).reduce((a, b) => a + b, 0) >= BATCH_SIZE) {
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
        }
        flushBatchToDB();
      }
    }
  });
};
