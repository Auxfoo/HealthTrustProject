const { ethers } = require("ethers");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
}

function getSignerContract() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required for backend blockchain proxy writes");
  }
  // Assumption: backend proxy routes use PRIVATE_KEY only for demos; production writes should use MetaMask.
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, getProvider());
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getProvider());
}

async function waitForTransaction(tx) {
  const receipt = await tx.wait();
  return { transactionHash: receipt.hash, blockNumber: receipt.blockNumber };
}

exports.grantAccessToDoctor = async (req, res) => {
  try {
    const { recordId, doctorAddress } = req.body;
    if (!recordId || !ethers.isAddress(doctorAddress)) {
      return res.status(400).json({ error: "recordId and a valid doctorAddress are required" });
    }
    const tx = await getSignerContract().grantAccessToDoctor(recordId, doctorAddress);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ error: "Unable to grant doctor access", detail: error.message });
  }
};

exports.revokeAccessFromDoctor = async (req, res) => {
  try {
    const { recordId, doctorAddress } = req.body;
    if (!recordId || !ethers.isAddress(doctorAddress)) {
      return res.status(400).json({ error: "recordId and a valid doctorAddress are required" });
    }
    const tx = await getSignerContract().revokeAccessFromDoctor(recordId, doctorAddress);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ error: "Unable to revoke doctor access", detail: error.message });
  }
};

exports.grantAccessToInstitution = async (req, res) => {
  try {
    const { recordId, institutionId } = req.body;
    if (!recordId || !institutionId) {
      return res.status(400).json({ error: "recordId and institutionId are required" });
    }
    const tx = await getSignerContract().grantAccessToInstitution(recordId, institutionId);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ error: "Unable to grant institution access", detail: error.message });
  }
};

exports.revokeAccessFromInstitution = async (req, res) => {
  try {
    const { recordId, institutionId } = req.body;
    if (!recordId || !institutionId) {
      return res.status(400).json({ error: "recordId and institutionId are required" });
    }
    const tx = await getSignerContract().revokeAccessFromInstitution(recordId, institutionId);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ error: "Unable to revoke institution access", detail: error.message });
  }
};

exports.checkAccess = async (req, res) => {
  try {
    const { recordId, doctorAddress } = req.query;
    if (!recordId || !ethers.isAddress(doctorAddress)) {
      return res.status(400).json({ error: "recordId and a valid doctorAddress are required" });
    }
    const hasAccess = await getReadContract().hasAccess(recordId, doctorAddress);
    res.json({ hasAccess });
  } catch (error) {
    res.status(500).json({ error: "Unable to check access", detail: error.message });
  }
};
