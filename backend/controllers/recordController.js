const axios = require("axios");
const FormData = require("form-data");
const { ethers } = require("ethers");
const prisma = require("../lib/prisma");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getReadContract() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "";
  const provider = !rpcUrl || rpcUrl.includes("your_api_key")
    ? ethers.getDefaultProvider("sepolia")
    : new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

function serializeRecord(record) {
  return {
    id: Number(record.id),
    cid: record.cid,
    uploadedBy: record.uploadedBy,
    timestamp: Number(record.timestamp),
  };
}

exports.uploadRecord = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Encrypted file blob is required" });
    }
    if (req.file.size > 15 * 1024 * 1024) {
      return res.status(400).json({ error: "Encrypted upload must be 15 MB or smaller" });
    }
    const looksEncrypted = /\.encrypted\.txt$/i.test(req.file.originalname || "");
    if (!["text/plain", "application/octet-stream"].includes(req.file.mimetype) && !looksEncrypted) {
      return res.status(400).json({ error: "Only encrypted text record uploads are accepted" });
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "encrypted-record.txt",
      contentType: req.file.mimetype || "application/octet-stream",
    });

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    });

    res.json({ cid: response.data.IpfsHash });
  } catch (error) {
    res.status(500).json({
      error: "Unable to upload encrypted record to IPFS",
      detail: error.response?.data || error.message,
    });
  }
};

exports.getRecordsByWallet = async (req, res) => {
  try {
    const contract = getReadContract();
    const records = await contract.getAllRecords();
    const wallet = req.params.wallet.toLowerCase();
    if (wallet !== req.authWallet?.toLowerCase()) {
      return res.status(403).json({ error: "Wallet can only fetch its own record list" });
    }
    const filtered = records
      .map(serializeRecord)
      .filter((record) => record.uploadedBy.toLowerCase() === wallet);

    const metadataRows = await prisma.recordMetadata.findMany({
      where: { recordId: { in: filtered.map((record) => record.id) } },
    });
    const metadataById = Object.fromEntries(metadataRows.map((row) => [row.recordId, row]));

    res.json(filtered.map((record) => ({ ...record, metadata: metadataById[record.id] || null })));
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch records from blockchain", detail: error.message });
  }
};

exports.upsertMetadata = async (req, res) => {
  try {
    const { recordId, ownerWallet, filename, mimeType, title, category, provider, visitDate, notes, archived, important, emergency } =
      req.body;
    if (!recordId || !ownerWallet) {
      return res.status(400).json({ error: "recordId and ownerWallet are required" });
    }

    const normalizedOwner = ownerWallet.toLowerCase();
    const authWallet = req.authWallet?.toLowerCase();
    const records = await getReadContract().getAllRecords();
    const record = records.map(serializeRecord).find((item) => item.id === Number(recordId));
    const onChainOwner = record?.uploadedBy?.toLowerCase?.();
    const isOwner = normalizedOwner === authWallet || onChainOwner === authWallet;
    const canDeliverDoctorRecord = onChainOwner === normalizedOwner && authWallet && authWallet !== normalizedOwner;
    if (!isOwner && !canDeliverDoctorRecord) {
      return res.status(403).json({ error: "Only the record owner or creating clinician can save metadata" });
    }

    const metadata = await prisma.recordMetadata.upsert({
      where: { recordId: Number(recordId) },
      update: {
        ownerWallet: normalizedOwner,
        filename,
        mimeType,
        title,
        category: category || "other",
        provider,
        visitDate: visitDate ? new Date(visitDate) : null,
        notes,
        archived: Boolean(archived),
        important: Boolean(important),
        emergency: Boolean(emergency),
      },
      create: {
        recordId: Number(recordId),
        ownerWallet: normalizedOwner,
        filename,
        mimeType,
        title,
        category: category || "other",
        provider,
        visitDate: visitDate ? new Date(visitDate) : null,
        notes,
        archived: Boolean(archived),
        important: Boolean(important),
        emergency: Boolean(emergency),
      },
    });

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: "Unable to save record metadata", detail: error.message });
  }
};

exports.getMetadataByIds = async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter(Boolean);
    if (!ids.length) return res.json([]);

    const metadata = await prisma.recordMetadata.findMany({
      where: { recordId: { in: ids } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch record metadata", detail: error.message });
  }
};
