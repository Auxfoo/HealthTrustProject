const prisma = require("./prisma");

async function createNotification(wallet, type, title, message) {
  if (!wallet) return null;
  return prisma.notification.create({
    data: {
      wallet: String(wallet).toLowerCase(),
      type,
      title,
      message,
    },
  });
}

module.exports = { createNotification };
