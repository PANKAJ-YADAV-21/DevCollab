import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devcollab';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // Quick timeout for local check
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[Database] MongoDB Connection Warning: ${error.message}`);
    console.warn(`[Database] Running in decoupled mode. Ensure MongoDB is running to persist data.`);
    return false;
  }
};
