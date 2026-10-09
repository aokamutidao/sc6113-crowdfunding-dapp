const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdfundingFactory", function () {
  let factory;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const CrowdfundingFactory = await ethers.getContractFactory("CrowdfundingFactory");
    factory = await CrowdfundingFactory.deploy();
  });

  it("Should create a new project", async function () {
    const title = "Test Project";
    const description = "This is a test project description";
    const category = "Technology";
    const goalAmount = ethers.parseEther("1");
    const deadline = (await time.latest()) + 86400;

    const tx = await factory.createProject(title, description, category, goalAmount, deadline);
    await tx.wait();

    expect(await factory.getProjectCount()).to.equal(1);
  });

  it("Should get all projects", async function () {
    const title = "Test Project";
    const description = "This is a test project description";
    const category = "Technology";
    const goalAmount = ethers.parseEther("1");
    const deadline = (await time.latest()) + 86400;

    await factory.createProject(title, description, category, goalAmount, deadline);

    const projects = await factory.getAllProjects();
    expect(projects.length).to.equal(1);
  });

  it("Should reject invalid title", async function () {
    const title = "Test";
    const description = "This is a test project description";
    const category = "Technology";
    const goalAmount = ethers.parseEther("1");
    const deadline = (await time.latest()) + 86400;

    await expect(
      factory.createProject(title, description, category, goalAmount, deadline)
    ).to.be.revertedWith("Title must be at least 5 characters");
  });
});
