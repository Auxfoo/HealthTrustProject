const prisma = require("../lib/prisma");

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
