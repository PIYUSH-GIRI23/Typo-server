import { connectMQ, USER_QUEUE } from "../init/queue.js";

const pushUserQueue = async (action, username, data, datetime, priority = 5) => {
  const ch = await connectMQ();
  const message = { action, username, data, datetime };
  ch.sendToQueue(USER_QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    priority,
  });
  console.log("Message pushed to userQueue:", message);
};

export { pushUserQueue };
