import { connectMQ, MAIL_QUEUE } from "../init/queue.js";
import { env } from "../init/env.js";

const sendDirectMail = async (mailId, type, datetime) => {
  try {
    const url = `${env.mailServiceUrl}/api/mail/send`;
    console.log(`📡 Direct API Mode: Sending mail event to ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mailId, type, datetime }),
    });
    if (!response.ok) {
      console.error(`Failed to send direct mail to ${url}: ${response.statusText}`);
      return false;
    }
    const data = await response.json();
    console.log("Direct mail sent successfully:", data);
    return true;
  } catch (error) {
    console.error("Error sending direct mail:", error);
    return false;
  }
};

const sendMail = async (mailId, type, datetime, priority = 5) => {
  if (env.isQueueEnabled) {
    const ch = await connectMQ();
    const message = { mailId, type, datetime };
    ch.sendToQueue(MAIL_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      priority,
    });
    console.log("Message pushed to mailQueue:", message);
  } else {
    await sendDirectMail(mailId, type, datetime);
  }
};

export { sendMail, sendDirectMail };



