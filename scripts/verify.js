const hre = require("hardhat");

async function main() {
  const address = process.argv[2] || process.env.BOTSPEND_ADDRESS;
  if (!address) throw new Error("Pass the deployed address or set BOTSPEND_ADDRESS.");

  await hre.run("verify:verify", { address, constructorArguments: [] });
  console.log(`PayMesh contract (BotSpend) verified at: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});