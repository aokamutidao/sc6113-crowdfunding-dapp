const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdfundingProject", function () {
  let factory;
  let project;
  let creator;
  let contributor1;

  beforeEach(async function () {
    [creator, contributor1] = await ethers.getSigners();

    const CrowdfundingFactory = await ethers.getContractFactory("CrowdfundingFactory");
    factory = await CrowdfundingFactory.deploy();

    const goalAmount = ethers.parseEther("10");
    const deadline = (await time.latest()) + 86400;

    const tx = await factory.connect(creator).createProject(
      "Test Project",
      "This is a test project description for testing",
      "Technology",
      goalAmount,
      deadline
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.topics[0] === factory.interface.getEvent("ProjectCreated").topicHash);
    const projectAddress = factory.interface.decodeEventLog("ProjectCreated", event.data, event.topics).projectAddress;

    project = await ethers.getContractAt("CrowdfundingProject", projectAddress);
  });

  it("Should accept contributions", async function () {
    const contributionAmount = ethers.parseEther("1");
    await project.connect(contributor1).contribute({ value: contributionAmount });

    expect(await project.totalRaised()).to.equal(contributionAmount);
  });

  it("Should allow withdrawal when successful", async function () {
    const goalAmount = ethers.parseEther("10");
    await project.connect(contributor1).contribute({ value: goalAmount });
    await time.increase(86401);

    await project.connect(creator).withdrawFunds();

    expect(await project.fundsWithdrawn()).to.be.true;
  });

  it("Should allow refund when failed", async function () {
    const contributionAmount = ethers.parseEther("1");
    await project.connect(contributor1).contribute({ value: contributionAmount });
    await time.increase(86401);

    await project.connect(contributor1).refund();

    const contribution = await project.getContribution(contributor1.address);
    expect(contribution.refunded).to.be.true;
  });

  it("Should allow project updates", async function () {
    const updateContent = "Project is progressing well!";
    await project.connect(creator).postUpdate(updateContent);

    const updates = await project.getUpdates();
    expect(updates.length).to.equal(1);
    expect(updates[0].content).to.equal(updateContent);
  });
});
