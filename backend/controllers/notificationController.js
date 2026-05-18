const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.create = async (req, res) => {
  try {
    const { wallet, type = "system", title, message } = req.body;
    if (!wallet || !title) {
      return res.status(400).json({ message: "wallet and title are required" });
    }

    const notification = await createNotification(wallet, type, title, message);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Unable to create notification", error: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { wallet: req.authWallet.toLowerCase() },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch notifications", error: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { wallet: req.authWallet.toLowerCase(), id: Number(req.params.id) },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Unable to update notification", error: error.message });
  }
};
