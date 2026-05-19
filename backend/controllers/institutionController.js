const { ethers } = require("ethers");
const prisma = require("../lib/prisma");
const contractConfig = require("../../shared/contractConfig");
const { createNotification } = require("../lib/notifications");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
}

function getSignerContract() {
  // Assumption: backend proxy route is kept for API completeness; MetaMask is preferred for admin writes.
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, getProvider());
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getProvider());
}

async function extractInstitutionId(receipt) {
  const iface = new ethers.Interface(CONTRACT_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "InstitutionRegistered") {
        return Number(parsed.args.institutionId);
      }
    } catch (error) {
      // Ignore logs from other contracts in the transaction receipt.
    }
  }
  return null;
}

exports.registerInstitution = async (req, res) => {
  try {
    const { name, institutionType, adminWallet, institutionId } = req.body;

    if (!name || !institutionType || !adminWallet) {
      return res.status(400).json({ message: "name, institutionType, and adminWallet are required" });
    }
    if (req.authWallet && req.authWallet !== adminWallet.toLowerCase()) {
      return res.status(403).json({ message: "Signed wallet must match institution admin wallet" });
    }

    let onChainId = institutionId ? Number(institutionId) : null;
    let transactionHash = null;

    if (!onChainId) {
      const tx = await getSignerContract().registerInstitution(name, institutionType);
      const receipt = await tx.wait();
      transactionHash = receipt.hash;
      onChainId = await extractInstitutionId(receipt);
    }

    if (!onChainId) {
      return res.status(500).json({ message: "Unable to determine on-chain institution ID" });
    }

    const institution = await prisma.institution.upsert({
      where: { institutionId: onChainId },
      update: {
        name,
        institutionType,
        adminWallet: adminWallet.toLowerCase(),
      },
      create: {
        institutionId: onChainId,
        name,
        institutionType,
        adminWallet: adminWallet.toLowerCase(),
      },
    });

    res.status(201).json({ institution, transactionHash });
  } catch (error) {
    res.status(500).json({ message: "Unable to register institution", error: error.message });
  }
};

exports.addDoctor = async (req, res) => {
  try {
    const { institutionId, doctorAddress } = req.body;
    const tx = await getSignerContract().addDoctorToInstitution(institutionId, doctorAddress);
    const receipt = await tx.wait();
    res.json({ transactionHash: receipt.hash, blockNumber: receipt.blockNumber });
  } catch (error) {
    res.status(500).json({ message: "Unable to add doctor to institution", error: error.message });
  }
};

exports.removeDoctor = async (req, res) => {
  try {
    const { institutionId, doctorAddress } = req.body;
    const tx = await getSignerContract().removeDoctorFromInstitution(institutionId, doctorAddress);
    const receipt = await tx.wait();
    res.json({ transactionHash: receipt.hash, blockNumber: receipt.blockNumber });
  } catch (error) {
    res.status(500).json({ message: "Unable to remove doctor from institution", error: error.message });
  }
};

exports.getInstitutions = async (req, res) => {
  try {
    const institutions = await prisma.institution.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch institutions", error: error.message });
  }
};

exports.getInstitutionDoctors = async (req, res) => {
  try {
    const doctors = await getReadContract().getInstitutionDoctors(req.params.id);
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch institution doctors", error: error.message });
  }
};

async function requireInstitutionAdmin(institutionId, wallet) {
  const institution = await prisma.institution.findUnique({ where: { institutionId: Number(institutionId) } });
  if (!institution) return { ok: false, status: 404, message: "Institution not found" };
  if (institution.adminWallet.toLowerCase() !== wallet.toLowerCase()) {
    return { ok: false, status: 403, message: "Only institution admin can perform this action" };
  }
  return { ok: true, institution };
}

exports.linkDoctorProfile = async (req, res) => {
  try {
    const access = await requireInstitutionAdmin(req.params.id, req.authWallet);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const doctorWallet = req.params.doctorWallet.toLowerCase();
    await prisma.user.updateMany({
      where: { wallet: doctorWallet, role: "doctor" },
      data: { institutionId: Number(req.params.id) },
    });
    await createNotification(
      doctorWallet,
      "membership_approved",
      "Institution membership active",
      `You were added to ${access.institution.name}.`
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Unable to link doctor profile", error: error.message });
  }
};

exports.unlinkDoctorProfile = async (req, res) => {
  try {
    const access = await requireInstitutionAdmin(req.params.id, req.authWallet);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const doctorWallet = req.params.doctorWallet.toLowerCase();
    await prisma.user.updateMany({
      where: { wallet: doctorWallet, role: "doctor", institutionId: Number(req.params.id) },
      data: { institutionId: null },
    });
    await createNotification(
      doctorWallet,
      "membership_removed",
      "Removed from institution",
      `You were removed from ${access.institution.name}.`
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Unable to unlink doctor profile", error: error.message });
  }
};
