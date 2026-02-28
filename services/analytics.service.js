import Analytics from '../models/analytics.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

const resetAnalytics = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const formattedUserId = new mongoose.Types.ObjectId(userId);
  const analytics = await Analytics.findOneAndUpdate(
    { userId: formattedUserId },
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
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const formattedUserId = new mongoose.Types.ObjectId(userId);
  const analytics = await Analytics.findOne({ userId: formattedUserId }).populate({
    path: 'userId',
    select: 'firstName lastName username email lastLogin dateOfJoining -_id'
  });

  return analytics;
};

const updateAnalytics = async (userId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const formattedUserId = new mongoose.Types.ObjectId(userId);
  const { wpm, accuracy, testTimings, maxStreak, lastTestTaken } = payload;

  const floor2 = (num) => Math.floor(num * 100) / 100;

  const safeWpm = floor2(wpm);
  const safeAccuracy = floor2(accuracy);

  const today = new Date().toLocaleDateString('en-CA');

  const currentAnalytics = await Analytics.findOne({ userId: formattedUserId });
  if (!currentAnalytics) return null;

  let updatedProgress = currentAnalytics.progress ? [...currentAnalytics.progress] : [];

  const lastEntry = updatedProgress[updatedProgress.length - 1];
  const isFirstTestToday = !lastEntry || lastEntry.date !== today;

  if (isFirstTestToday) {
    const newEntry = {
      date: today,
      wpm: safeWpm,
      accuracy: safeAccuracy,
      count: 1
    };

    if (updatedProgress.length >= 10) {
      updatedProgress.shift();
    }

    updatedProgress.push(newEntry);
  } else {
    const existingEntry = updatedProgress[updatedProgress.length - 1];

    const newCount = existingEntry.count + 1;

    existingEntry.wpm = floor2(
      (existingEntry.wpm * existingEntry.count + safeWpm) / newCount
    );

    existingEntry.accuracy = floor2(
      (existingEntry.accuracy * existingEntry.count + safeAccuracy) / newCount
    );

    existingEntry.count = newCount;
  }

  const analytics = await Analytics.findOneAndUpdate(
    { userId: formattedUserId },
    {
      wpm: safeWpm,
      accuracy: safeAccuracy,
      testTimings,
      maxStreak,
      lastTestTaken,
      progress: updatedProgress,
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