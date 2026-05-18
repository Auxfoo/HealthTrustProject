const { ethers } = require("ethers");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
}

function getSignerContract() {
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
    const tx = await getSignerContract().grantAccessToDoctor(recordId, doctorAddress);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ message: "Unable to grant doctor access", error: error.message });
  }
};

exports.revokeAccessFromDoctor = async (req, res) => {
  try {
    const { recordId, doctorAddress } = req.body;
    const tx = await getSignerContract().revokeAccessFromDoctor(recordId, doctorAddress);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ message: "Unable to revoke doctor access", error: error.message });
  }
};

exports.grantAccessToInstitution = async (req, res) => {
  try {
    const { recordId, institutionId } = req.body;
    const tx = await getSignerContract().grantAccessToInstitution(recordId, institutionId);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ message: "Unable to grant institution access", error: error.message });
  }
};

exports.revokeAccessFromInstitution = async (req, res) => {
  try {
    const { recordId, institutionId } = req.body;
    const tx = await getSignerContract().revokeAccessFromInstitution(recordId, institutionId);
    res.json(await waitForTransaction(tx));
  } catch (error) {
    res.status(500).json({ message: "Unable to revoke institution access", error: error.message });
  }
};

exports.checkAccess = async (req, res) => {
  try {
    const { recordId, doctorAddress } = req.query;
    const hasAccess = await getReadContract().hasAccess(recordId, doctorAddress);
    res.json({ hasAccess });
  } catch (error) {
    res.status(500).json({ message: "Unable to check access", error: error.message });
  }
};
