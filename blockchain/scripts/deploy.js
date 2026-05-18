const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const HealthTrust = await hre.ethers.getContractFactory("HealthTrust");
  const healthTrust = await HealthTrust.deploy();
  await healthTrust.waitForDeployment();

  const contractAddress = await healthTrust.getAddress();
  const artifact = await hre.artifacts.readArtifact("HealthTrust");

  const sharedDir = path.join(__dirname, "..", "..", "shared");
  fs.mkdirSync(sharedDir, { recursive: true });

  const config = `const CONTRACT_ADDRESS = "${contractAddress}";
const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};
const HealthTrustContractConfig = { CONTRACT_ADDRESS, CONTRACT_ABI };

if (typeof module !== "undefined") {
  module.exports = HealthTrustContractConfig;
}

if (typeof window !== "undefined") {
  window.HealthTrustContractConfig = HealthTrustContractConfig;
}
`;

  fs.writeFileSync(path.join(sharedDir, "contractConfig.js"), config);
  console.log(`HealthTrust deployed to ${contractAddress}`);
  console.log("Contract config written to shared/contractConfig.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
