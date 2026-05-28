const axios = require("axios");
const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.predictDiabetes = async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const { patientWallet, ...features } = req.body;
    const response = await axios.post(`${mlServiceUrl}/predict`, features);
    const result = response.data;
    await prisma.predictionHistory.create({
      data: {
        doctorWallet: req.authWallet,
        patientWallet: patientWallet ? patientWallet.toLowerCase() : null,
        prediction: result.prediction,
        probability: result.probability,
        features,
      },
    });
    if (patientWallet) {
      await createNotification(
        patientWallet,
        "prediction",
        "Prediction run",
        `A doctor ran a diabetes prediction with ${Math.round(result.probability * 100)}% risk probability`
      );
    }
    res.json(result);
  } catch (error) {
    const status = error.response?.status === 400 ? 400 : 500;
    const detail = error.response?.data?.detail;
    res.status(status).json({
      message: detail?.message || "Unable to get diabetes prediction",
      error: error.response?.data || error.message,
    });
  }
};

exports.getPredictionHistory = async (req, res) => {
  try {
    const history = await prisma.predictionHistory.findMany({
      where: { doctorWallet: req.authWallet },
      orderBy: { createdAt: "desc" },
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch prediction history", error: error.message });
  }
};
