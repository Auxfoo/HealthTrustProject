import { getSigner } from "./contractHelper";

const AUTH_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const AUTH_SESSION_REFRESH_SKEW_MS = 10 * 60 * 1000;
const AUTH_SESSION_STORAGE_VERSION = "v2";
const pendingSessions = new Map();

function sessionKey(wallet) {
  return `healthtrust_auth_session_${AUTH_SESSION_STORAGE_VERSION}_${wallet?.toLowerCase()}`;
}

function buildMessage(wallet, action = "session", expiresAt = Date.now() + AUTH_SESSION_TTL_MS) {
  return [
    "HealthTrust wallet authorization",
    `Wallet: ${wallet.toLowerCase()}`,
    `Action: ${action}`,
    `Timestamp: ${Date.now()}`,
    `Expires At: ${expiresAt}`,
  ].join("\n");
}

function parseMessage(message) {
  return Object.fromEntries(
    String(message || "")
      .split("\n")
      .map((row) => row.split(":"))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...value]) => [key.trim().toLowerCase(), value.join(":").trim()])
  );
}

function readStoredSession(wallet) {
  const key = sessionKey(wallet);
  try {
    const session = JSON.parse(sessionStorage.getItem(key) || "null");
    const fields = parseMessage(session?.message);
    const expiresAt = Number(fields["expires at"]);
    if (
      !session?.message ||
      !session?.signature ||
      fields.action !== "session" ||
      fields.wallet?.toLowerCase() !== wallet.toLowerCase() ||
      !Number.isFinite(expiresAt) ||
      Date.now() > expiresAt - AUTH_SESSION_REFRESH_SKEW_MS
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return session;
  } catch (error) {
    sessionStorage.removeItem(key);
    return null;
  }
}

export async function createAuthSession(wallet) {
  const cached = readStoredSession(wallet);
  if (cached) return cached;

  const normalizedWallet = wallet.toLowerCase();
  const pending = pendingSessions.get(normalizedWallet);
  if (pending) return pending;

  const expiresAt = Date.now() + AUTH_SESSION_TTL_MS;
  const message = buildMessage(wallet, "session", expiresAt);
  const sessionPromise = (async () => {
    const signer = await getSigner(wallet);
    const signature = await signer.signMessage(message);
    const session = { wallet: normalizedWallet, message, signature };
    sessionStorage.setItem(sessionKey(wallet), JSON.stringify(session));
    return session;
  })();

  pendingSessions.set(normalizedWallet, sessionPromise);
  try {
    return await sessionPromise;
  } finally {
    pendingSessions.delete(normalizedWallet);
  }
}

export async function createAuthHeaders(wallet) {
  const session = await createAuthSession(wallet);
  return {
    "x-wallet": wallet.toLowerCase(),
    "x-auth-message": encodeURIComponent(session.message),
    "x-auth-signature": session.signature,
  };
}

export async function createAuthBody(wallet, body = {}) {
  const session = await createAuthSession(wallet);
  return { ...body, auth: session };
}

export function clearAuthSession(wallet) {
  if (wallet) sessionStorage.removeItem(sessionKey(wallet));
}

export function clearAllAuthSessions() {
  Object.keys(sessionStorage)
    .filter((key) => key.startsWith("healthtrust_auth_session_"))
    .forEach((key) => sessionStorage.removeItem(key));
}
