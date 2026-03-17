import { createClient, RedisClientType } from "redis";

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis.");
  } catch (error) {
    console.error("Redis connection failed:", error);
  }
};