const prisma = require("../lib/prisma");

exports.registerUser = async (req, res) => {
  try {
    const {
      wallet,
      name,
      email,
      role,
      institutionId,
      encryptionPublicKey,
      bloodType,
      allergies,
      chronicConditions,
      emergencyContact,
    } = req.body;

    if (!wallet || !name || !email || !role) {
      return res.status(400).json({ error: "wallet, name, email, and role are required" });
    }

    const normalizedWallet = wallet.toLowerCase();
    if (req.authWallet !== normalizedWallet) {
      return res.status(403).json({ error: "Signed wallet does not match registration wallet" });
    }
    const user = await prisma.user.upsert({
      where: { wallet: normalizedWallet },
      update: {
        name,
        email,
        role,
        institutionId: institutionId === undefined || institutionId === "" ? null : Number(institutionId),
        encryptionPublicKey,
        bloodType,
        allergies,
        chronicConditions,
        emergencyContact,
      },
      create: {
        wallet: normalizedWallet,
        name,
        email,
        role,
        institutionId: institutionId === undefined || institutionId === "" ? null : Number(institutionId),
        encryptionPublicKey,
        bloodType,
        allergies,
        chronicConditions,
        emergencyContact,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Unable to register user", detail: error.message });
  }
};

exports.getUserByWallet = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { wallet: req.params.wallet.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch user", detail: error.message });
  }
};
