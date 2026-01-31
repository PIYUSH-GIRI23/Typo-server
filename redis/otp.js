import { connectRedis } from "../init/redis.js";

const OTP_TTL_SECONDS = 120;
const MAX_ATTEMPTS = 3;

const getOtpKey = (email) => `otp:${email}`;

const setOtp = async (email, otp, ttlSeconds = OTP_TTL_SECONDS) => {
  const redis = await connectRedis();
  const key = getOtpKey(email);
  const payload = {
    otp,
    attempts: 0,
  };
  await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds);
  return payload;
};

const getOtp = async (email) => {
  const redis = await connectRedis();
  const key = getOtpKey(email);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const incrementOtpAttempts = async (email) => {
  const redis = await connectRedis();
  const key = getOtpKey(email);
  const raw = await redis.get(key);
  if (!raw) return null;
  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  payload.attempts = (payload.attempts || 0) + 1;
  const ttl = await redis.ttl(key);
  const ttlSeconds = ttl > 0 ? ttl : OTP_TTL_SECONDS;
  await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds);
  return payload;
};

const deleteOtp = async (email) => {
  const redis = await connectRedis();
  const key = getOtpKey(email);
  await redis.del(key);
};

const otpStore = {
  OTP_TTL_SECONDS,
  MAX_ATTEMPTS,
  setOtp,
  getOtp,
  incrementOtpAttempts,
  deleteOtp,
};

export default otpStore;
