import { connectRedis } from "../init/redis.js";

const isUsernamePresent = async (username) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  const exists = await redis.exists(key);
  return exists === 1;
};

const deleteUsernameKey = async (username) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  await redis.del(key);
  console.log(`Deleted key: ${key}`);
};

const setUserData = async (username, data) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  // expect data to be an object like { accuracy: '', wpm: '' }
  await redis.set(key, JSON.stringify(data));
  return data;
};

const updateUserData = async (username, updates) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  const existing = await redis.get(key);
  let obj = {};
  if (existing) {
    try {
      obj = JSON.parse(existing);
    } catch (e) {
      obj = {};
    }
  }
  const merged = { ...obj, ...updates };
  await redis.set(key, JSON.stringify(merged));
  return merged;
};


export {
  isUsernamePresent,
  deleteUsernameKey,
  setUserData,
  updateUserData,
};
