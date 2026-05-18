const prisma = require("../lib/prisma");

exports.registerUser = async (req, res) => {
  try {
    const { wallet, name, email, role, institutionId } = req.body;

    if (!wallet || !name || !email || !role) {
      return res.status(400).json({ message: "wallet, name, email, and role are required" });
    }

    const normalizedWallet = wallet.toLowerCase();
    const user = await prisma.user.upsert({
      where: { wallet: normalizedWallet },
      update: {
        name,
        email,
        role,
        institutionId: institutionId === undefined || institutionId === "" ? null : Number(institutionId),
      },
      create: {
        wallet: normalizedWallet,
        name,
        email,
        role,
        institutionId: institutionId === undefined || institutionId === "" ? null : Number(institutionId),
      },
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: "Unable to register user", error: error.message });
  }
};

exports.getUserByWallet = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { wallet: req.params.wallet.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch user", error: error.message });
  }
};
