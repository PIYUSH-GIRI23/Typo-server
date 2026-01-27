import Redis from "ioredis";
import { env } from "./env.js";

let client = null;

const connectRedis = async () => {
  if (client) return client;

  client = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
  });

  client.on("connect", () => console.log("Redis connected"));
  client.on("error", (err) => console.error("Redis error:", err));

  await client.connect().catch(() => {}); 

  return client;
};

const stopRedis = async () => {
  if (client) {
    await client.quit();
    console.log("Redis connection closed");
    client = null;
  }
};

const setupRedisSignalHandlers = () => {
  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down Redis gracefully...`);
    await stopRedis();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

export {
  connectRedis,
  stopRedis,
  setupRedisSignalHandlers,
};
