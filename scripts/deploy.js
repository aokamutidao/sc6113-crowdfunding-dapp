const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CrowdfundingFactory contract...");

  const CrowdfundingFactory = await hre.ethers.getContractFactory("CrowdfundingFactory");
  const factory = await CrowdfundingFactory.deploy();

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("✅ CrowdfundingFactory deployed to:", factoryAddress);

  // Local automining only creates a block when a transaction is sent.
  // Waiting for five confirmations locally would stall this script.
  const confirmations = ["hardhat", "localhost"].includes(hre.network.name) ? 1 : 5;
  console.log(`⏳ Waiting for ${confirmations} block confirmation(s)...`);
  await factory.deploymentTransaction().wait(confirmations);

  console.log("🎉 Deployment complete!");
  console.log("📝 Factory Address:", factoryAddress);

  // Verify contract on Etherscan (if on a public testnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    factoryAddress: factoryAddress,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-" + hre.network.name + ".json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
