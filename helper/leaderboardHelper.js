import Analytics from "../models/analytics.model.js";
import User from "../models/user.model.js";
import { setLeaderboard } from "../redis/user.js";

const calculateScore = (wpm, accuracy) => {
  return wpm * 0.7 + accuracy * 0.3;
};

export const generateLeaderboard = async () => {
  try {
    // 1. Get top 10 analytics with user populated (single query!)
    const analyticsList = await Analytics
      .find()
      .sort({ wpm: -1, accuracy: -1 })
      .limit(10)
      .populate('userId', 'username') // Populate user with only username field
      .lean();

    const leaderboard = [];

    // 2. Map analytics to leaderboard format
    for (let i = 0; i < analyticsList.length; i++) {
      const analytics = analyticsList[i];

      leaderboard.push({
        rank: i + 1,
        userId: analytics.userId?._id?.toString() || analytics.userId.toString(),
        username: analytics.userId?.username || "Unknown",
        wpm: Number(analytics.wpm.toFixed(2)),
        accuracy: Number(analytics.accuracy.toFixed(2)),
        weightedScore: Number(
          calculateScore(analytics.wpm, analytics.accuracy).toFixed(2)
        )
      });
    }

    // 3. Save in Redis
    await setLeaderboard(leaderboard);

    return leaderboard;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to generate leaderboard");
  }
};


const leaderboard = {generateLeaderboard}
export default leaderboard;