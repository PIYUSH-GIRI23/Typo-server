import amqp from "amqplib";
import { env } from "./env.js";

let connection = null;
let channel = null;

const MAIL_QUEUE = "mailQueue";
const USER_QUEUE = "userQueue";

const connectMQ = async () => {
  if (channel) return channel;

  if (!connection) {
    const url = `amqp://${env.rabbitmq.user}:${env.rabbitmq.password}@${env.rabbitmq.host}:${env.rabbitmq.port}`;
    connection = await amqp.connect(url);
    console.log("RabbitMQ connected");
  }

  channel = await connection.createChannel();

  await channel.assertQueue(MAIL_QUEUE, { durable: true, maxPriority: 10 });
  await channel.assertQueue(USER_QUEUE, { durable: true, maxPriority: 10 });

  return channel;
};

const stopMQ = async () => {
  if (channel) {
    await channel.close();
    console.log("RabbitMQ channel closed");
  }
  if (connection) {
    await connection.close();
    console.log("RabbitMQ connection closed");
  }
  channel = null;
  connection = null;
};

const setupSignalHandlers = () => {
  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down RabbitMQ gracefully...`);
    await stopMQ();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

export {
  connectMQ,
  stopMQ,
  setupSignalHandlers,
  MAIL_QUEUE,
  USER_QUEUE,
};
