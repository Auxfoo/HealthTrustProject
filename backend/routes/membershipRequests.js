const express = require("express");
const membershipRequestController = require("../controllers/membershipRequestController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireWalletAuth("create-membership-request"), membershipRequestController.createRequest);
router.get("/", requireWalletAuth("read-membership-requests"), membershipRequestController.getMine);
router.patch("/:id", requireWalletAuth("update-membership-request"), membershipRequestController.updateRequest);

module.exports = router;
