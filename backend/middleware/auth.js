const { ethers } = require("ethers");

const MAX_AUTH_AGE_MS = 5 * 60 * 1000;
const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000;

function decodeMessage(message) {
  try {
    return decodeURIComponent(message);
  } catch (error) {
    return message;
  }
}

function parseAuth(req) {
  const message = req.get("x-auth-message") || req.body?.auth?.message;
  return {
    wallet: req.get("x-wallet") || req.body?.auth?.wallet,
    message: message ? decodeMessage(message) : message,
    signature: req.get("x-auth-signature") || req.body?.auth?.signature,
  };
}

function parseMessage(message) {
  const rows = String(message || "").split("\n");
  return Object.fromEntries(
    rows
      .map((row) => row.split(":"))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...value]) => [key.trim().toLowerCase(), value.join(":").trim()])
  );
}

function requireWalletAuth(expectedAction) {
  return (req, res, next) => {
    try {
      const { wallet, message, signature } = parseAuth(req);
      if (!wallet || !message || !signature) {
        return res.status(401).json({ message: "Signed wallet authentication is required" });
      }

      const recovered = ethers.verifyMessage(message, signature).toLowerCase();
      const normalizedWallet = wallet.toLowerCase();
      if (recovered !== normalizedWallet) {
        return res.status(401).json({ message: "Wallet signature does not match the claimed wallet" });
      }

      const fields = parseMessage(message);
      if (fields.wallet?.toLowerCase() !== normalizedWallet) {
        return res.status(401).json({ message: "Signed message wallet does not match request wallet" });
      }

      const action = fields.action;
      const isSession = action === "session";
      if (expectedAction && action !== expectedAction && !isSession) {
        return res.status(401).json({ message: "Signed message action is invalid" });
      }

      const timestamp = Number(fields.timestamp);
      const maxAge = isSession ? MAX_SESSION_AGE_MS : MAX_AUTH_AGE_MS;
      const now = Date.now();
      if (!Number.isFinite(timestamp) || timestamp > now + MAX_AUTH_AGE_MS || now - timestamp > maxAge) {
        return res.status(401).json({ message: "Signed message is expired or invalid" });
      }

      if (isSession) {
        const expiresAt = Number(fields["expires at"]);
        if (!Number.isFinite(expiresAt) || now > expiresAt || expiresAt - timestamp > MAX_SESSION_AGE_MS) {
          return res.status(401).json({ message: "Signed session is expired or invalid" });
        }
      }

      req.authWallet = normalizedWallet;
      next();
    } catch (error) {
      res.status(401).json({ message: "Unable to verify wallet signature", error: error.message });
    }
  };
}

module.exports = { requireWalletAuth };
