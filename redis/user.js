import { connectRedis } from "../init/redis.js";

const getUsernameKey = (username) => {
  const prefix = process.env.REDIS_USERNAME_KEY_PREFIX || "typo:username:";
  return `${prefix}${username}`;
};

const getLeaderboardKey = () => {
  return process.env.REDIS_LEADERBOARD_KEY || "typo:leaderboard";
};

const isUsernamePresent = async (username) => {
  const redis = await connectRedis();
  const key = getUsernameKey(username);
  const exists = await redis.exists(key);
  return exists === 1;
};

const setUsername = async (username, ttlSeconds = 60 * 60) => {
  const redis = await connectRedis();
  const key = getUsernameKey(username);
  await redis.set(key, 1, "EX", ttlSeconds);
  return 1;
};

const deleteUsernameKey = async (username) => {
  const redis = await connectRedis();
  const key = getUsernameKey(username);
  await redis.del(key);
  console.log(`Deleted key: ${key}`);
};

//provided array (of objects) under key `typo:leaderboard`.
const setLeaderboard = async (arrayValue) => {
  const redis = await connectRedis();
  const key = getLeaderboardKey();
  if (!Array.isArray(arrayValue)) {
    throw new Error('Leaderboard value must be an array');
  }
  await redis.set(key, JSON.stringify(arrayValue));
  return arrayValue;
};

const getLeaderboard = async () => {
  const redis = await connectRedis();
  const key = getLeaderboardKey();
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
  setLeaderboard,
  getLeaderboard,
};
