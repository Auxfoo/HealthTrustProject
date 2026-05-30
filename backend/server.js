const express = require("express");
const cors = require("cors");
require("dotenv").config();

const prisma = require("./lib/prisma");
const userRoutes = require("./routes/users");
const recordRoutes = require("./routes/records");
const accessRoutes = require("./routes/access");
const institutionRoutes = require("./routes/institutions");
const predictRoutes = require("./routes/predict");
const recordKeyRoutes = require("./routes/recordKeys");
const accessRequestRoutes = require("./routes/accessRequests");
const noteRoutes = require("./routes/notes");
const membershipRequestRoutes = require("./routes/membershipRequests");
const doctorDocumentRoutes = require("./routes/doctorDocuments");
const notificationRoutes = require("./routes/notifications");

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
app.use("/api/record-keys", recordKeyRoutes);
app.use("/api/access-requests", accessRequestRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/membership-requests", membershipRequestRoutes);
app.use("/api/doctor-documents", doctorDocumentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

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
