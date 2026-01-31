import Analytics from '../models/analytics.model.js';
import User from '../models/user.model.js';

const resetAnalytics = async (userId) => {
  const analytics = await Analytics.findOneAndUpdate(
    { userId },
    {
      wpm: 0,
      accuracy: 0,
      testTimings: 0,
      lastTestTaken: null,
      totalPar: 0,
      maxStreak: 0
    },
    { new: true }
  );

  return analytics;
};

const getAnalytics = async (userId) => {
  const analytics = await Analytics.findOne({ userId }).populate({
    path: 'userId',
    as: 'userData',
    select: 'firstName lastName username email lastLogin'
  });

  return analytics;
};

const updateAnalytics = async (userId, payload) => {
  const { wpm, accuracy, testTimings, maxStreak, lastTestTaken } = payload;

  const analytics = await Analytics.findOneAndUpdate(
    { userId },
    {
      wpm,
      accuracy,
      testTimings,
      maxStreak,
      lastTestTaken,
      $inc: { totalPar: 1 }
    },
    { new: true, runValidators: true }
  );

  return analytics;
};

const getAccountAnalytics = async (username) => {
  const user = await User.findOne({ username }).select('_id firstName lastName username');
  if (!user) return null;

  const analytics = await Analytics.findOne({ userId: user._id });

  if (!analytics) return null;
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    wpm: analytics.wpm,
    accuracy: analytics.accuracy,
    totalPar: analytics.totalPar,
  };
};

const analyticsService = {
  resetAnalytics,
  getAnalytics,
  updateAnalytics,
  getAccountAnalytics
};

export default analyticsService;