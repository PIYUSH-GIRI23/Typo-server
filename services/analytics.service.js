import Analytics from '../models/analytics.model.js';

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

const analyticsService = {
  resetAnalytics,
  getAnalytics,
  updateAnalytics
};

export default analyticsService;