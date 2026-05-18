const express = require("express");
const multer = require("multer");
const recordController = require("../controllers/recordController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), recordController.uploadRecord);
router.get("/:wallet", recordController.getRecordsByWallet);

module.exports = router;
