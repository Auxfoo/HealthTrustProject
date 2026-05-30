const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.create = async (req, res) => {
  try {
    const { wallet, type = "system", title, message } = req.body;
    if (!wallet || !title) {
      return res.status(400).json({ error: "wallet and title are required" });
    }

    const notification = await createNotification(wallet, type, title, message);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: "Unable to create notification", detail: error.message });
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
    res.status(500).json({ error: "Unable to fetch notifications", detail: error.message });
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
    res.status(500).json({ error: "Unable to update notification", detail: error.message });
  }
};
