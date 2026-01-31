import { connectMQ, PARAGRAPH_QUEUE } from "../init/queue.js";

const pushParagraphQueue = async (data, priority = 5) => {
  const ch = await connectMQ();
  ch.sendToQueue(PARAGRAPH_QUEUE, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    priority,
  });
};

export { pushParagraphQueue };
