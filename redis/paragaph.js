import { connectRedis } from "../init/redis.js";

const setParagraph = async (key, paragraph) => {
  const redis = await connectRedis();
  await redis.set(key, paragraph);
  console.log(`Paragraph saved with key=${key}`);
};

const getParagraph = async (key) => {
  const redis = await connectRedis();
  const paragraph = await redis.get(key);
  return paragraph;
};

export { setParagraph, getParagraph };
