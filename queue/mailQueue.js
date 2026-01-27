import { connectMQ, MAIL_QUEUE } from "../init/queue.js";

const pushMailQueue = async (mailId, type, datetime, priority = 5) => {
  const ch = await connectMQ();
  const message = { mailId, type, datetime };
  ch.sendToQueue(MAIL_QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    priority,
  });
  console.log("Message pushed to mailQueue:", message);
};

export { pushMailQueue };
