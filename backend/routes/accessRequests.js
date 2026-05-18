const express = require("express");
const accessRequestController = require("../controllers/accessRequestController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireWalletAuth("create-access-request"), accessRequestController.createRequest);
router.get("/", requireWalletAuth("read-access-requests"), accessRequestController.getMine);
router.patch("/:id", requireWalletAuth("update-access-request"), accessRequestController.updateRequest);

module.exports = router;
