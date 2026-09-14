const { ethers } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const network = await ethers.provider.getNetwork();
  const BotSpend = await ethers.getContractFactory("BotSpend");
  const botSpend = await BotSpend.deploy();

  await botSpend.waitForDeployment();

  const address = await botSpend.getAddress();
  const deployment = {
    address,
    chainId: Number(network.chainId),
    network: network.name,
    deployedAt: new Date().toISOString(),
  };
  const outputDirectory = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, `${network.name}.json`), `${JSON.stringify(deployment, null, 2)}\n`);

  console.log(`BotSpend deployed to: ${address}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Set NEXT_PUBLIC_BOTSPEND_ADDRESS=${address}`);
  console.log(`Verify with: npm run verify:botchain:testnet -- ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
