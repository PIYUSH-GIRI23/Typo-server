import mongoose from 'mongoose';
import {env} from './env.js';

let client = null;
let db = null;

const connectDB = async () => {
  try {
    client = await mongoose.connect(env.mongoURI);
    db = client.connection.db;
    console.log('Database connected successfully');
    return db;
  } 
  catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
};

const closeConnection = async () => {
  if (client) {
    await mongoose.disconnect();
    console.log('Database connection closed');
    client = null;
    db = null;
  }
};

const setupSignalHandlers = () => {
  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await closeConnection();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

export { connectDB, getDatabase, closeConnection, setupSignalHandlers };