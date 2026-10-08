import dotenv from "dotenv";
import { resolve } from "node:path";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config({ path: resolve(__dirname, "../back-end/.env") });

import express from "express";
import swaggerUi from "swagger-ui-express";
import productRoutes from "./routes/productRoutes";
import authRouter from "./routes/authRouter";
import orderRoutes from "./routes/order";
import { swaggerSpec } from "./swagger";
import connectDB from "./config/db";
import { sendEmail } from "./utils/sendEmail";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "E-commerce API is running",
  });
});

// TEMPORARY TEST ROUTE - delete after the test works
app.get("/test-email", async (_req, res) => {
  try {
    await sendEmail(
      "gasanaurumuri@gmail.com",
      "Test from my shop",
      "<h2>Hello!</h2><p>Brevo works.</p>"
    );
    res.json({ message: "Email sent" });
  } catch (err) {
    res.status(500).json({ message: "Email failed, check terminal" });
  }
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/products", productRoutes);
app.use("/api/auth", authRouter);
app.use("/api/orders", orderRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});