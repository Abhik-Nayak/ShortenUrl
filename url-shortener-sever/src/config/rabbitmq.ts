import amqp from "amqplib";
import Url from "../models/Url";
import createLogger from "../utils/logger";

const log = createLogger("RabbitMQ");

let channel: amqp.Channel;

const QUEUE_NAME = "url_clicks_queue";

export const isRabbitMQConnected = (): boolean => !!channel;

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const host = process.env.Rabbitmq_Host || "localhost";
    const user = process.env.Rabbitmq_Username || "guest";
    const pass = process.env.Rabbitmq_Password || "guest";

    const connectionUrl = `amqp://${user}:${pass}@${host}:5672`;

    const connection = await amqp.connect(connectionUrl);

    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    log.info("Connected & queue asserted");

    // Start the background consumer
    startClickBatchWorker();
  } catch (error) {
    log.error("Connection failed", { error: error instanceof Error ? error.message : String(error) });
  }
};

export const publishClickEvent = (shortCode: string): void => {
  if (!channel) {
    log.warn("Channel not initialized, dropping click event", { shortCode });
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
      log.info("Flushed click batch to MongoDB", { urls: bulkOps.length, messages: messagesToAck.length });
    }

    // Ack all messages only after successful DB write
    for (const msg of messagesToAck) {
      channel.ack(msg);
    }
  } catch (error) {
    log.error("Flush failed, nacking messages for redelivery", { error: error instanceof Error ? error.message : String(error) });
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
