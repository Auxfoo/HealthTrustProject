const express = require("express");
const cors = require("cors");
require("dotenv").config();

const prisma = require("./lib/prisma");
const userRoutes = require("./routes/users");
const recordRoutes = require("./routes/records");
const accessRoutes = require("./routes/access");
const institutionRoutes = require("./routes/institutions");
const predictRoutes = require("./routes/predict");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "HealthTrust backend" });
});

app.use("/api/users", userRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/predict", predictRoutes);

async function startServer() {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log(`HealthTrust backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
