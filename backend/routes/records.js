const express = require("express");
const multer = require("multer");
const recordController = require("../controllers/recordController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", requireWalletAuth("upload-record"), upload.single("file"), recordController.uploadRecord);
router.post("/metadata", requireWalletAuth("save-record-metadata"), recordController.upsertMetadata);
router.get("/metadata/bulk", recordController.getMetadataByIds);
router.get("/:wallet", recordController.getRecordsByWallet);

module.exports = router;
