import { createClient, RedisClientType } from "redis";
import createLogger from "../utils/logger";

const log = createLogger("Redis");

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  log.error("Connection error", { error: err instanceof Error ? err.message : String(err) });
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    log.info("Connected");
  } catch (error) {
    log.error("Connection failed", { error: error instanceof Error ? error.message : String(error) });
  }
};