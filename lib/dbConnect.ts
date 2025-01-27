// lib/db.ts
import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: Number
}

const connection: ConnectionObject = {}

async function dbConnect(): Promise<void> {
  if (connection.isConnected) return;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not found");
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: true,
      socketTimeoutMS: 45000,
      dbName: process.env.MONGODB_DB,
      retryWrites: true,
      maxPoolSize: 50
    });
    
    connection.isConnected = db.connections[0].readyState;
    
    mongoose.connection.on('error', console.error);
    mongoose.connection.on('disconnected', () => {
      connection.isConnected = 0;
    });

  } catch (error: any) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export default dbConnect;