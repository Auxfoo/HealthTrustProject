const express = require("express");
const doctorDocumentController = require("../controllers/doctorDocumentController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireWalletAuth("create-doctor-document"), doctorDocumentController.createDocument);
router.get("/", requireWalletAuth("read-doctor-documents"), doctorDocumentController.getMine);

module.exports = router;
