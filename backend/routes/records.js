const express = require("express");
const multer = require("multer");
const recordController = require("../controllers/recordController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();
const MAX_ENCRYPTED_UPLOAD_BYTES = 15 * 1024 * 1024;
const allowedEncryptedUploadTypes = new Set(["text/plain", "application/octet-stream"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ENCRYPTED_UPLOAD_BYTES, files: 1 },
  fileFilter(req, file, callback) {
    const looksEncrypted = /\.encrypted\.txt$/i.test(file.originalname || "");
    if (!allowedEncryptedUploadTypes.has(file.mimetype) && !looksEncrypted) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
    }
    callback(null, true);
  },
});

function uploadEncryptedRecord(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    const isTooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(400).json({
      error: isTooLarge
        ? "Encrypted upload must be 15 MB or smaller"
        : "Only encrypted text record uploads are accepted",
    });
  });
}

router.post("/upload", requireWalletAuth("upload-record"), uploadEncryptedRecord, recordController.uploadRecord);
router.post("/metadata", requireWalletAuth("save-record-metadata"), recordController.upsertMetadata);
router.get("/metadata/bulk", requireWalletAuth("read-record-metadata"), recordController.getMetadataByIds);
router.get("/:wallet", requireWalletAuth("read-records"), recordController.getRecordsByWallet);

module.exports = router;
