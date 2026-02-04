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
    select: 'firstName lastName username email lastLogin -_id'
  });

  return analytics;
};

const updateAnalytics = async (userId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const formattedUserId = new mongoose.Types.ObjectId(userId);
  const { wpm, accuracy, testTimings, maxStreak, lastTestTaken } = payload;

  const today = new Date().toISOString().split('T')[0];
  const currentAnalytics = await Analytics.findOne({ userId: formattedUserId });

  if (!currentAnalytics) return null;
  
  let updatedProgress = [...currentAnalytics.progress];
  
  const lastEntry = updatedProgress[updatedProgress.length - 1];
  const isFirstTestToday = !lastEntry || lastEntry.date !== today;

  if (isFirstTestToday) {
    const newEntry = { 
      date: today, 
      wpm, 
      accuracy, 
      count: 1 
    };
    
    if (updatedProgress.length >= 10) {
      updatedProgress.shift();
    }
    
    updatedProgress.push(newEntry);
  }
  else {
    // Update today's entry (last entry) with cumulative average
    const existingEntry = updatedProgress[updatedProgress.length - 1];
    
    const newCount = existingEntry.count + 1;
    existingEntry.wpm = (existingEntry.wpm * existingEntry.count + wpm) / newCount;
    existingEntry.accuracy = (existingEntry.accuracy * existingEntry.count + accuracy) / newCount;
    existingEntry.count = newCount;
  }

  // Update analytics with new progress
  const analytics = await Analytics.findOneAndUpdate(
    { userId: formattedUserId },
    {
      wpm,
      accuracy,
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