import { env } from "../init/env.js";
import quotes from "../data/quote.js";
import paragaph from "../data/paragraph.js";
import { pushParagraphQueue } from "../queue/paragraphQueue.js";

const loadParagraphsToQueue = async () => {
  try {
    const paragraphQueues = [];

    // Load quotes
    const quoteKey = env.para.quote;
    const maxQuotes = Math.min(env.para.max, quotes.length);
    for (let i = 0; i < maxQuotes; i++) {
      const id = `${quoteKey}${i + 1}`;
      const payload = {
        id,
        content: quotes[i],
        type: "quote",
      };
      paragraphQueues.push(pushParagraphQueue(payload, 3));
    }

    // Load easy short paragraphs
    const easyShortKey = env.para.wordEasyShort;
    const maxEasyShort = Math.min(env.para.max, paragaph.easyShortPara.length);
    for (let i = 0; i < maxEasyShort; i++) {
      const id = `${easyShortKey}${i + 1}`;
      const payload = {
        id,
        content: paragaph.easyShortPara[i],
        type: "paragraph",
        difficulty: "easy",
        length: "short",
      };
      paragraphQueues.push(pushParagraphQueue(payload, 3));
    }

    // Load easy long paragraphs
    const easyLongKey = env.para.wordEasyLong;
    const maxEasyLong = Math.min(env.para.max, paragaph.easyLongPara.length);
    for (let i = 0; i < maxEasyLong; i++) {
      const id = `${easyLongKey}${i + 1}`;
      const payload = {
        id,
        content: paragaph.easyLongPara[i],
        type: "paragraph",
        difficulty: "easy",
        length: "long",
      };
      paragraphQueues.push(pushParagraphQueue(payload, 3));
    }

    // Load hard short paragraphs
    const hardShortKey = env.para.wordHardShort;
    const maxHardShort = Math.min(env.para.max, paragaph.hardShortPara.length);
    for (let i = 0; i < maxHardShort; i++) {
      const id = `${hardShortKey}${i + 1}`;
      const payload = {
        id,
        content: paragaph.hardShortPara[i],
        type: "paragraph",
        difficulty: "hard",
        length: "short",
      };
      paragraphQueues.push(pushParagraphQueue(payload, 3));
    }

    // Load hard long paragraphs
    const hardLongKey = env.para.wordHardLong;
    const maxHardLong = Math.min(env.para.max, paragaph.hardLongPara.length);
    for (let i = 0; i < maxHardLong; i++) {
      const id = `${hardLongKey}${i + 1}`;
      const payload = {
        id,
        content: paragaph.hardLongPara[i],
        type: "paragraph",
        difficulty: "hard",
        length: "long",
      };
      paragraphQueues.push(pushParagraphQueue(payload, 3));
    }

    // Execute all queue pushes in parallel
    await Promise.all(paragraphQueues);
    console.log(`✓ Loaded ${paragraphQueues.length} paragraphs to queue`);
  } catch (error) {
    console.error("Failed to load paragraphs to queue:", error.message);
  }
};

export { loadParagraphsToQueue };
