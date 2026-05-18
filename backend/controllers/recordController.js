const axios = require("axios");
const FormData = require("form-data");
const { ethers } = require("ethers");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getReadContract() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
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
      return res.status(400).json({ message: "Encrypted file blob is required" });
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
      message: "Unable to upload encrypted record to IPFS",
      error: error.response?.data || error.message,
    });
  }
};

exports.getRecordsByWallet = async (req, res) => {
  try {
    const contract = getReadContract();
    const records = await contract.getAllRecords();
    const wallet = req.params.wallet.toLowerCase();
    const filtered = records
      .map(serializeRecord)
      .filter((record) => record.uploadedBy.toLowerCase() === wallet);

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch records from blockchain", error: error.message });
  }
};
