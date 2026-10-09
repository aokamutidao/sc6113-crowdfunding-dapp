const hre = require("hardhat");

async function main() {
  console.log("🧪 Running comprehensive test...\n");

  // Get signers
  const [deployer, user1, user2] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("👤 User1:", user1.address);
  console.log("👤 User2:", user2.address);
  console.log();

  // Deploy factory
  console.log("📦 Deploying CrowdfundingFactory...");
  const CrowdfundingFactory = await hre.ethers.getContractFactory("CrowdfundingFactory");
  const factory = await CrowdfundingFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed to:", factoryAddress);
  console.log();

  // Create a project
  console.log("🎯 Creating a crowdfunding project...");
  const goalAmount = hre.ethers.parseEther("10");
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

  const tx = await factory.connect(user1).createProject(
    "Test Project",
    "This is a test project for demonstration",
    "Technology",
    goalAmount,
    deadline
  );
  const receipt = await tx.wait();
  console.log("✅ Project created!");
  console.log("   Transaction hash:", receipt.hash);

  // Get project address
  const projects = await factory.getAllProjects();
  const projectAddress = projects[0];
  console.log("   Project address:", projectAddress);
  console.log();

  // Get project contract
  const project = await hre.ethers.getContractAt("CrowdfundingProject", projectAddress);

  // Check project info
  console.log("📊 Project Info:");
  const info = await project.getProjectInfo();
  console.log("   Title:", info._title);
  console.log("   Creator:", info._creator);
  console.log("   Goal:", hre.ethers.formatEther(info._goalAmount), "ETH");
  console.log("   Deadline:", new Date(Number(info._deadline) * 1000).toLocaleString());
  console.log("   Status:", info._status === 0 ? "Active" : "Unknown");
  console.log();

  // Test contribution
  console.log("💰 Testing contribution...");
  const contributionAmount = hre.ethers.parseEther("5");
  const contributeTx = await project.connect(user2).contribute({ value: contributionAmount });
  await contributeTx.wait();
  console.log("✅ Contribution successful!");
  console.log("   Amount:", hre.ethers.formatEther(contributionAmount), "ETH");
  console.log("   Total raised:", hre.ethers.formatEther(await project.totalRaised()), "ETH");
  console.log();

  // Check contribution record
  console.log("📝 Checking contribution record...");
  const contribution = await project.getContribution(user2.address);
  console.log("   Contributor:", user2.address);
  console.log("   Amount:", hre.ethers.formatEther(contribution.amount), "ETH");
  console.log("   Refunded:", contribution.refunded);
  console.log();

  // Test project update
  console.log("📢 Testing project update...");
  const updateTx = await project.connect(user1).postUpdate("Project is progressing well!");
  await updateTx.wait();
  console.log("✅ Update posted!");

  const updates = await project.getUpdates();
  console.log("   Total updates:", updates.length);
  console.log("   Latest update:", updates[0].content);
  console.log();

  // Check progress
  console.log("📈 Progress:");
  const progress = await project.getProgressPercentage();
  console.log("   Progress:", progress.toString() + "%");
  console.log("   Contributors:", (await project.getContributorCount()).toString());
  console.log();

  console.log("🎉 All tests passed successfully!");
  console.log("\n📋 Summary:");
  console.log("   ✅ Factory deployment");
  console.log("   ✅ Project creation");
  console.log("   ✅ Contribution");
  console.log("   ✅ Project update");
  console.log("   ✅ Data retrieval");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
