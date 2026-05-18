import { base64 } from "@scure/base";
import nacl from "tweetnacl";

function bytesToBase64(bytes) {
  return base64.encode(bytes);
}

function base64ToBytes(value) {
  return base64.decode(value);
}

function utf8ToBytes(value) {
  return new TextEncoder().encode(value);
}

function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function utf8ToHex(value) {
  return `0x${Array.from(utf8ToBytes(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToUtf8(value) {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []);
  return bytesToUtf8(bytes);
}

function normalizeEncryptedKey(encryptedKey) {
  if (typeof encryptedKey !== "string") {
    const json = JSON.stringify(encryptedKey);
    return { payload: encryptedKey, hex: utf8ToHex(json) };
  }

  if (encryptedKey.startsWith("0x")) {
    const json = hexToUtf8(encryptedKey);
    return { payload: JSON.parse(json), hex: encryptedKey };
  }

  return { payload: JSON.parse(encryptedKey), hex: utf8ToHex(encryptedKey) };
}

export async function getEncryptionPublicKey(walletAddress) {
  if (!window.ethereum?.request) {
    throw new Error("MetaMask is required to register an encryption key");
  }
  return window.ethereum.request({
    method: "eth_getEncryptionPublicKey",
    params: [walletAddress],
  });
}

export function encryptRecordKeyForDoctor(aesKey, publicKey) {
  if (!publicKey) throw new Error("Recipient encryption public key is missing");
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(utf8ToBytes(aesKey), nonce, base64ToBytes(publicKey), ephemeral.secretKey);
  return utf8ToHex(JSON.stringify({
    version: "x25519-xsalsa20-poly1305",
    nonce: bytesToBase64(nonce),
    ephemPublicKey: bytesToBase64(ephemeral.publicKey),
    ciphertext: bytesToBase64(encrypted),
  }));
}

export async function decryptRecordKey(encryptedKey, walletAddress) {
  if (!window.ethereum?.request) {
    throw new Error("MetaMask is required to decrypt the shared record key.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const hasWallet = accounts.some((account) => account.toLowerCase() === walletAddress.toLowerCase());
  if (!hasWallet) {
    throw new Error("Switch MetaMask to the doctor wallet that received access, then try View again.");
  }

  const { hex } = normalizeEncryptedKey(encryptedKey);
  try {
    return await window.ethereum.request({
      method: "eth_decrypt",
      params: [hex, walletAddress],
    });
  } catch (error) {
    throw new Error(error.message || "MetaMask could not decrypt the shared record key.");
  }
}

export function decryptRecordKeyLocally(encryptedKey, secretKey) {
  const { payload } = normalizeEncryptedKey(encryptedKey);
  const decrypted = nacl.box.open(
    base64ToBytes(payload.ciphertext),
    base64ToBytes(payload.nonce),
    base64ToBytes(payload.ephemPublicKey),
    base64ToBytes(secretKey)
  );
  if (!decrypted) throw new Error("Unable to decrypt record key");
  return bytesToUtf8(decrypted);
}
