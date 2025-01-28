import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: number; // Use `number` (primitive) instead of `Number` (object type)
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
  if (connection.isConnected) {
    console.log("Already connected to database");
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  try {
    // Suppress deprecation warnings for modern MongoDB usage
    mongoose.set("strictQuery", true);

    const db = await mongoose.connect(process.env.MONGODB_URI);

    connection.isConnected = db.connections[0].readyState;

    console.log("Connected to MongoDB:", process.env.MONGODB_URI);
    console.log("Connection state:", connection.isConnected);

    // Register connection event listeners (only once)
    mongoose.connection.once("connected", () => {
      console.log("MongoDB connected successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error; // Re-throw error for proper handling
  }
}

export default dbConnect;
