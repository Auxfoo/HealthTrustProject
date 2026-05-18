const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");
const { requireWalletAuth } = require("../middleware/auth");

function runMiddleware({ wallet, message, signature }, action = "test-action") {
  return new Promise((resolve) => {
    const req = {
      body: {},
      get(header) {
        return {
          "x-wallet": wallet,
          "x-auth-message": message,
          "x-auth-signature": signature,
        }[header.toLowerCase()];
      },
    };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        resolve({ req, res });
      },
    };
    requireWalletAuth(action)(req, res, () => resolve({ req, res }));
  });
}

test("wallet auth accepts a fresh matching signature", async () => {
  const signer = ethers.Wallet.createRandom();
  const message = [
    "HealthTrust backend authorization",
    `Wallet: ${signer.address.toLowerCase()}`,
    "Action: test-action",
    `Timestamp: ${Date.now()}`,
  ].join("\n");
  const signature = await signer.signMessage(message);
  const { req, res } = await runMiddleware({ wallet: signer.address, message, signature });
  assert.equal(res.statusCode, 200);
  assert.equal(req.authWallet, signer.address.toLowerCase());
});

test("wallet auth rejects mismatched actions", async () => {
  const signer = ethers.Wallet.createRandom();
  const message = [
    "HealthTrust backend authorization",
    `Wallet: ${signer.address.toLowerCase()}`,
    "Action: other-action",
    `Timestamp: ${Date.now()}`,
  ].join("\n");
  const signature = await signer.signMessage(message);
  const { res } = await runMiddleware({ wallet: signer.address, message, signature });
  assert.equal(res.statusCode, 401);
});

test("wallet auth accepts a signed reusable session", async () => {
  const signer = ethers.Wallet.createRandom();
  const timestamp = Date.now();
  const message = [
    "HealthTrust backend authorization",
    `Wallet: ${signer.address.toLowerCase()}`,
    "Action: session",
    `Timestamp: ${timestamp}`,
    `Expires At: ${timestamp + 8 * 60 * 60 * 1000}`,
  ].join("\n");
  const signature = await signer.signMessage(message);
  const { req, res } = await runMiddleware({ wallet: signer.address, message, signature }, "save-doctor-note");
  assert.equal(res.statusCode, 200);
  assert.equal(req.authWallet, signer.address.toLowerCase());
});

test("wallet auth rejects expired sessions", async () => {
  const signer = ethers.Wallet.createRandom();
  const timestamp = Date.now() - 9 * 60 * 60 * 1000;
  const message = [
    "HealthTrust backend authorization",
    `Wallet: ${signer.address.toLowerCase()}`,
    "Action: session",
    `Timestamp: ${timestamp}`,
    `Expires At: ${timestamp + 8 * 60 * 60 * 1000}`,
  ].join("\n");
  const signature = await signer.signMessage(message);
  const { res } = await runMiddleware({ wallet: signer.address, message, signature }, "save-doctor-note");
  assert.equal(res.statusCode, 401);
});
