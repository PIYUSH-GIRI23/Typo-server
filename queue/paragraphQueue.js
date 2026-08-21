import { connectMQ, PARAGRAPH_QUEUE } from "../init/queue.js";
import { env } from "../init/env.js";

const pushParagraphQueue = async (data, priority = 5) => {
  if (!env.isQueueEnabled) {
    return;
  }
  const ch = await connectMQ();
  ch.sendToQueue(PARAGRAPH_QUEUE, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    priority,
  });
};

export { pushParagraphQueue };
