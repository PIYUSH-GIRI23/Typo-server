import express from 'express';
import cron from 'node-cron';
import { env } from './init/env.js';
import { connectDB, setupDBSignalHandlers } from './init/db.js';
import { connectMQ, setupMQSignalHandlers } from './init/queue.js';
import { connectRedis, setupRedisSignalHandlers } from './init/redis.js';
import { loadParagraphsToQueue } from './helper/paragraphLoader.js';
import leaderboard  from './helper/leaderboardHelper.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorMiddleware);

const startServer = async () => {
  try {
    console.log('Connecting to services...');
    await connectDB();
    await connectMQ();
    await connectRedis();
    console.log('All services connected successfully');

    setupDBSignalHandlers();
    setupMQSignalHandlers();
    setupRedisSignalHandlers();

    await loadParagraphsToQueue();

    // Initialize leaderboard on startup
    console.log('Generating initial leaderboard...');
    await leaderboard.generateLeaderboard();

    // Setup Cron Job for periodic leaderboard refresh
    // Run leaderboard update every 30 minutes (0 and 30 minute mark each hour)
    // cron.schedule('0,30 * * * *', async () => {
    //   try {
    //     console.log('[CRON] Updating leaderboard...');
    //     await leaderboard.generateLeaderboard();
    //   } catch (error) {
    //     console.error('[CRON] Failed to update leaderboard:', error.message);
    //   }
    // });

    // console.log('✓ Cron job scheduled: Leaderboard updates every 30 minutes');

    app.listen(env.port, () => {
      console.log(`✓ Server running on port ${env.port}`);
    });
  } 
  catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();