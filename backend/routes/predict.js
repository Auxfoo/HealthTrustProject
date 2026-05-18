const express = require("express");
const predictController = require("../controllers/predictController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireWalletAuth("predict-diabetes"), predictController.predictDiabetes);
router.get("/history", requireWalletAuth("read-prediction-history"), predictController.getPredictionHistory);

module.exports = router;
