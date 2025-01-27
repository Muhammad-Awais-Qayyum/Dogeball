import mongoose from "mongoose";

type ConnectionObject = {
 isConnected?: Number
}

const connection: ConnectionObject = {}

async function dbConnect(): Promise<void> {
 if (connection.isConnected) {
   console.log("Already connected to database");
   return;
 }

 if (!process.env.MONGODB_URI) {
   throw new Error("MONGODB_URI not found in environment variables");
 }

 try {
   const db = await mongoose.connect(process.env.MONGODB_URI);
   
   connection.isConnected = db.connections[0].readyState;
   
   console.log("Connected to MongoDB:", process.env.MONGODB_URI);
   console.log("Connection state:", connection.isConnected);

 } catch (error: any) {
   console.error("MongoDB connection error:");
   console.error("Error type:", error.name);
   console.error("Error message:", error.message);
   console.error("Full error:", error);
   throw error;
 }

 mongoose.connection.on('connected', () => {
   console.log('MongoDB connected successfully');
 });

 mongoose.connection.on('error', (err) => {
   console.error('MongoDB connection error:', err);
 });

 mongoose.connection.on('disconnected', () => {
   console.log('MongoDB disconnected');
 });
}

export default dbConnect;