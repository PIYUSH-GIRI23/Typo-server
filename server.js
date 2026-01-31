import express from 'express';
import { env } from './init/env.js';
import { connectDB, setupDBSignalHandlers } from './init/db.js';
import { connectMQ, setupMQSignalHandlers } from './init/queue.js';
import { connectRedis, setupRedisSignalHandlers } from './init/redis.js';
import { loadParagraphsToQueue } from './helper/paragraphLoader.js';
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