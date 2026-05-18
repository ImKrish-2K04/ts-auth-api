import mongoose from "mongoose";
import { env } from "./config";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`Database connection succeeded: ${conn.connection.host}`);
  } catch (error) {
    console.log(
      `MongoDB connection error: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }
};

export default connectDB;
