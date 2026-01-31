import { connectRedis } from "../init/redis.js";

const isUsernamePresent = async (username) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  const exists = await redis.exists(key);
  return exists === 1;
};

const setUsername = async (username, ttlSeconds = 60 * 60) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  await redis.set(key, 1, "EX", ttlSeconds);
  return 1;
};

const deleteUsernameKey = async (username) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  await redis.del(key);
  console.log(`Deleted key: ${key}`);
};

const setUserData = async (username, data) => {
  const redis = await connectRedis();
  const key = `userdata:${username}`;
  // expect data to be an object like { accuracy: '', wpm: '' }
  await redis.set(key, JSON.stringify(data));
  return data;
};

const updateUserData = async (username, updates) => {
  const redis = await connectRedis();
  const key = `userdata:${username}`;
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

//provided array (of objects) under key `leaderboard`.
const setLeaderboard = async (arrayValue) => {
  const redis = await connectRedis();
  const key = 'leaderboard';
  if (!Array.isArray(arrayValue)) {
    throw new Error('Leaderboard value must be an array');
  }
  await redis.set(key, JSON.stringify(arrayValue));
  return arrayValue;
};

const getLeaderboard = async () => {
  const redis = await connectRedis();
  const key = 'leaderboard';
  const raw = await redis.get(key);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
};


export {
  isUsernamePresent,
  setUsername,
  deleteUsernameKey,
  setUserData,
  updateUserData,
  setLeaderboard,
  getLeaderboard,
};
