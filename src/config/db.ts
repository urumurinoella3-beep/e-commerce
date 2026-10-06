import mongoose from "mongoose";
import Order from "../models/order";

const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGO_URI as string
    );

    const database = connection.connection.db;

    if (database) {
      const orderCollectionExists = await database
        .listCollections({ name: Order.collection.collectionName }, { nameOnly: true })
        .hasNext();

      if (!orderCollectionExists) {
        await Order.createCollection();
      }
    }

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
    console.log("Orders collection is ready");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;