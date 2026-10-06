import express from "express";
import { resolve } from "node:path";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";

import productRoutes from "./routes/productRoutes";
import authRouter from "./routes/authRouter";
import orderRoutes from "./routes/order";
import { swaggerSpec } from "./swagger";
import connectDB from "./config/db";

dotenv.config({ path: resolve(__dirname, "../back-end/.env") });

const app = express();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "E-commerce API is running",
  });
});

// Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// Product routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRouter);
app.use("/api/orders", orderRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});