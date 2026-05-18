const axios = require("axios");

exports.predictDiabetes = async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const response = await axios.post(`${mlServiceUrl}/predict`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      message: "Unable to get diabetes prediction",
      error: error.response?.data || error.message,
    });
  }
};
