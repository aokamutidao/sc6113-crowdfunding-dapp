const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

async function deployFixture() {
  const [creator, alice, bob] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("CrowdfundingFactory");
  const factory = await Factory.deploy();
  const deploymentReceipt = await factory.deploymentTransaction().wait();
  const goal = ethers.parseEther("10");
  const deadline = (await time.latest()) + 86400;
  const creation = await factory.createProject(
    "Test Project", "This is a sufficiently detailed campaign description.", "Technology", goal, deadline
  );
  const creationReceipt = await creation.wait();
  const address = await factory.getProjectByIndex(0);
  const project = await ethers.getContractAt("CrowdfundingProject", address);
  return { creator, alice, bob, factory, project, goal, deadline, deploymentReceipt, creationReceipt };
}

describe("Factory validation and registry", function () {
  it("records the creator, metadata and ProjectCreated event", async function () {
    const { factory, project, creator, goal, deadline, creationReceipt } = await loadFixture(deployFixture);
    const event = creationReceipt.logs.map((log) => {
      try { return factory.interface.parseLog(log); } catch { return null; }
    }).find((log) => log?.name === "ProjectCreated");
    expect(event.args.projectAddress).to.equal(await project.getAddress());
    expect(event.args.creator).to.equal(creator.address);
    expect(event.args.projectId).to.equal(1);
    expect(event.args.goalAmount).to.equal(goal);
    expect(event.args.deadline).to.equal(deadline);
    expect(await project.creator()).to.equal(creator.address);
    expect(await project.title()).to.equal("Test Project");
  });

  it("indexes multiple creators and categories independently", async function () {
    const { factory, project, creator, alice, goal, deadline } = await loadFixture(deployFixture);
    await factory.connect(alice).createProject("Second project", "Second campaign description", "Education", goal, deadline);
    const second = await factory.getProjectByIndex(1);
    expect(await factory.getAllProjects()).to.deep.equal([await project.getAddress(), second]);
    expect(await factory.getUserProjects(creator.address)).to.deep.equal([await project.getAddress()]);
    expect(await factory.getUserProjects(alice.address)).to.deep.equal([second]);
    expect(await factory.getProjectsByCategory("Education")).to.deep.equal([second]);
    expect(await factory.getProjectsByCategory("Health")).to.deep.equal([]);
  });

  it("accepts the minimum title, description and goal", async function () {
    const { factory, deadline } = await loadFixture(deployFixture);
    await factory.createProject("12345", "1234567890", "Other", ethers.parseEther("0.01"), deadline);
    expect(await factory.getProjectCount()).to.equal(2);
  });

  const invalidCases = [
    ["a short title", { title: "1234" }, "Title must be at least 5 characters"],
    ["a long title", { title: "x".repeat(101) }, "Title must be at most 100 characters"],
    ["a short description", { description: "123456789" }, "Description must be at least 10 characters"],
    ["a long description", { description: "x".repeat(1001) }, "Description must be at most 1000 characters"],
    ["an empty category", { category: "" }, "Category cannot be empty"],
    ["a goal below 0.01 ETH", { goal: ethers.parseEther("0.009") }, "Goal amount must be at least 0.01 ETH"],
  ];
  for (const [name, overrides, message] of invalidCases) {
    it(`rejects ${name} without changing the registry`, async function () {
      const { factory, goal, deadline } = await loadFixture(deployFixture);
      const args = { title: "Valid title", description: "Valid description", category: "Technology", goal, deadline, ...overrides };
      await expect(factory.createProject(args.title, args.description, args.category, args.goal, args.deadline))
        .to.be.revertedWith(message);
      expect(await factory.getProjectCount()).to.equal(1);
    });
  }

  it("rejects a deadline at the current block timestamp", async function () {
    const { factory, goal } = await loadFixture(deployFixture);
    const deadline = (await time.latest()) + 1;
    await time.setNextBlockTimestamp(deadline);
    await expect(factory.createProject("Valid title", "Valid description", "Other", goal, deadline))
      .to.be.revertedWith("Deadline must be in the future");
  });

  it("rejects a deadline beyond 90 days", async function () {
    const { factory, goal } = await loadFixture(deployFixture);
    const deadline = (await time.latest()) + 90 * 86400 + 30;
    await expect(factory.createProject("Valid title", "Valid description", "Other", goal, deadline))
      .to.be.revertedWith("Deadline cannot exceed 90 days");
  });

  it("rejects an out-of-range project index", async function () {
    const { factory } = await loadFixture(deployFixture);
    await expect(factory.getProjectByIndex(1)).to.be.revertedWith("Index out of bounds");
  });

  it("exposes eight suggested categories", async function () {
    const { factory } = await loadFixture(deployFixture);
    expect(await factory.getAvailableCategories()).to.deep.equal([
      "Technology", "Education", "Charity", "Art", "Environment", "Health", "Business", "Other"
    ]);
  });
});

describe("Campaign financial lifecycle", function () {
  it("tracks contract ETH, contributor amount, event and timestamp", async function () {
    const { project, alice } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("1");
    const tx = await project.connect(alice).contribute({ value: amount });
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    await expect(tx).to.emit(project, "Contributed").withArgs(alice.address, amount, block.timestamp);
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(amount);
    const contribution = await project.getContribution(alice.address);
    expect(contribution.amount).to.equal(amount);
    expect(contribution.timestamp).to.equal(block.timestamp);
    expect(contribution.refunded).to.equal(false);
  });

  it("accumulates repeat contributions without duplicating contributors", async function () {
    const { project, alice, bob } = await loadFixture(deployFixture);
    await project.connect(alice).contribute({ value: ethers.parseEther("1") });
    await project.connect(alice).contribute({ value: ethers.parseEther("2") });
    await project.connect(bob).contribute({ value: ethers.parseEther("0.5") });
    expect(await project.totalRaised()).to.equal(ethers.parseEther("3.5"));
    expect(await project.getContributorCount()).to.equal(2);
    expect((await project.getContribution(alice.address)).amount).to.equal(ethers.parseEther("3"));
    expect(await project.isContributor(alice.address)).to.equal(true);
    expect((await project.getContributions()).length).to.equal(2);
  });

  it("rejects a zero-value contribution", async function () {
    const { project, alice } = await loadFixture(deployFixture);
    await expect(project.connect(alice).contribute({ value: 0 })).to.be.revertedWith("Contribution must be greater than 0");
  });

  it("keeps a funded campaign active until its deadline", async function () {
    const { project, alice, goal } = await loadFixture(deployFixture);
    await project.connect(alice).contribute({ value: goal });
    expect(await project.getStatus()).to.equal(0);
    await expect(project.withdrawFunds()).to.be.revertedWith("Project is not successful");
  });

  it("rejects contributions exactly at the deadline", async function () {
    const { project, alice, deadline } = await loadFixture(deployFixture);
    await time.setNextBlockTimestamp(deadline);
    await expect(project.connect(alice).contribute({ value: 1 })).to.be.revertedWith("Project is not active");
  });

  it("pays the creator all raised ETH, including overfunding, once", async function () {
    const { project, creator, alice, goal, deadline } = await loadFixture(deployFixture);
    const amount = goal + ethers.parseEther("1");
    await project.connect(alice).contribute({ value: amount });
    expect(await project.getProgressPercentage()).to.equal(110);
    await time.increaseTo(deadline);
    expect(await project.getStatus()).to.equal(1);
    await expect(project.connect(creator).withdrawFunds()).to.changeEtherBalances([project, creator], [-amount, amount]);
    expect(await project.fundsWithdrawn()).to.equal(true);
    expect(await project.getStatus()).to.equal(3);
    expect(await project.totalRaised()).to.equal(amount); // Historical gross amount, not the current balance.
    await expect(project.withdrawFunds()).to.be.revertedWith("Project is not successful");
  });

  it("rejects withdrawal by a non-creator", async function () {
    const { project, alice, goal, deadline } = await loadFixture(deployFixture);
    await project.connect(alice).contribute({ value: goal });
    await time.increaseTo(deadline);
    await expect(project.connect(alice).withdrawFunds()).to.be.revertedWith("Only creator can call this function");
  });

  it("rejects withdrawal when the campaign fails", async function () {
    const { project, deadline } = await loadFixture(deployFixture);
    await time.increaseTo(deadline);
    expect(await project.getStatus()).to.equal(2);
    await expect(project.withdrawFunds()).to.be.revertedWith("Project is not successful");
  });

  it("rejects refunds before the campaign deadline", async function () {
    const { project, alice } = await loadFixture(deployFixture);
    await project.connect(alice).contribute({ value: 1 });
    await expect(project.connect(alice).refund()).to.be.revertedWith("Project is not failed");
  });

  it("rejects refunds from a non-contributor", async function () {
    const { project, bob, deadline } = await loadFixture(deployFixture);
    await time.increaseTo(deadline);
    await expect(project.connect(bob).refund()).to.be.revertedWith("No contribution found");
    expect(await project.getContribution(bob.address)).to.deep.equal([0n, 0n, false]);
    expect(await project.isContributor(bob.address)).to.equal(false);
  });

  it("refunds each contributor independently and prevents a second refund", async function () {
    const { project, alice, bob, deadline } = await loadFixture(deployFixture);
    const a = ethers.parseEther("1");
    const b = ethers.parseEther("2");
    await project.connect(alice).contribute({ value: a });
    await project.connect(bob).contribute({ value: b });
    await time.increaseTo(deadline);
    await expect(project.connect(alice).refund()).to.changeEtherBalances([project, alice], [-a, a]);
    expect((await project.getContribution(alice.address)).refunded).to.equal(true);
    await expect(project.connect(alice).refund()).to.be.revertedWith("Already refunded");
    await expect(project.connect(bob).refund()).to.changeEtherBalances([project, bob], [-b, b]);
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(0);
    expect(await project.totalRaised()).to.equal(a + b);
    expect(await project.getStatus()).to.equal(2);
  });

  it("rejects refunds for a successful campaign", async function () {
    const { project, alice, goal, deadline } = await loadFixture(deployFixture);
    await project.connect(alice).contribute({ value: goal });
    await time.increaseTo(deadline);
    await expect(project.connect(alice).refund()).to.be.revertedWith("Project is not failed");
  });

  it("rejects updates by a non-creator and empty update content", async function () {
    const { project, alice } = await loadFixture(deployFixture);
    await expect(project.connect(alice).postUpdate("Unauthorised update")).to.be.revertedWith("Only creator can call this function");
    await expect(project.postUpdate("")).to.be.revertedWith("Update content cannot be empty");
  });

  it("records creator updates and returns complete project information", async function () {
    const { project, creator, goal, deadline } = await loadFixture(deployFixture);
    const tx = await project.postUpdate("Prototype completed.");
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    await expect(tx).to.emit(project, "UpdatePosted").withArgs("Prototype completed.", block.timestamp);
    const info = await project.getProjectInfo();
    expect(info._creator).to.equal(creator.address);
    expect(info._goalAmount).to.equal(goal);
    expect(info._deadline).to.equal(deadline);
    expect(info._status).to.equal(0);
    expect(info._updateCount).to.equal(1);
    expect((await project.getUpdates())[0].timestamp).to.equal(block.timestamp);
  });
});

describe("Constructor validation", function () {
  const invalidCases = [
    ["zero creator", { creator: ethers.ZeroAddress }, "Invalid creator address"],
    ["zero goal", { goal: 0 }, "Goal amount must be greater than 0"],
    ["past deadline", { deadline: 1 }, "Deadline must be in the future"],
    ["empty title", { title: "" }, "Title cannot be empty"],
    ["empty description", { description: "" }, "Description cannot be empty"],
  ];
  for (const [name, overrides, message] of invalidCases) {
    it(`rejects ${name} for direct deployments`, async function () {
      const { creator, goal, deadline } = await loadFixture(deployFixture);
      const Contract = await ethers.getContractFactory("CrowdfundingProject");
      const args = { creator: creator.address, title: "Valid title", description: "Valid description", goal, deadline, ...overrides };
      await expect(Contract.deploy(args.creator, args.title, args.description, "Other", args.goal, args.deadline))
        .to.be.revertedWith(message);
    });
  }
});

describe("ETH payment security", function () {
  async function receiverFixture() {
    const base = await deployFixture();
    const Receiver = await ethers.getContractFactory("PaymentReceiver");
    const receiver = await Receiver.deploy();
    return { ...base, receiver };
  }

  it("blocks a nested refund without consuming another contributor's ETH", async function () {
    const { project, alice, receiver, deadline } = await loadFixture(receiverFixture);
    const amount = ethers.parseEther("1");
    await receiver.contribute(await project.getAddress(), { value: amount });
    await project.connect(alice).contribute({ value: amount });
    await receiver.configure(false, true);
    await time.increaseTo(deadline);
    await expect(receiver.refund()).to.changeEtherBalances([project, receiver], [-amount, amount]);
    expect(await receiver.reentrySucceeded()).to.equal(false);
    expect(await receiver.reentryError()).to.equal(ethers.id("ReentrancyGuardReentrantCall()").slice(0, 10));
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(amount);
    await expect(project.connect(alice).refund()).to.changeEtherBalances([project, alice], [-amount, amount]);
  });

  it("restores refund state after a receiver rejects ETH and allows retry", async function () {
    const { project, receiver, deadline } = await loadFixture(receiverFixture);
    const amount = ethers.parseEther("1");
    await receiver.contribute(await project.getAddress(), { value: amount });
    await receiver.configure(true, false);
    await time.increaseTo(deadline);
    await expect(receiver.refund()).to.be.revertedWith("Refund transfer failed");
    expect((await project.getContribution(await receiver.getAddress())).refunded).to.equal(false);
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(amount);
    await receiver.configure(false, false);
    await expect(receiver.refund()).to.changeEtherBalances([project, receiver], [-amount, amount]);
  });

  it("blocks a nested creator withdrawal", async function () {
    const { factory, alice, receiver, goal, deadline } = await loadFixture(receiverFixture);
    await receiver.createProject(await factory.getAddress(), goal, deadline);
    const project = await ethers.getContractAt("CrowdfundingProject", await receiver.project());
    await project.connect(alice).contribute({ value: goal });
    await receiver.configure(false, true);
    await time.increaseTo(deadline);
    await expect(receiver.withdrawFunds()).to.changeEtherBalances([project, receiver], [-goal, goal]);
    expect(await receiver.reentrySucceeded()).to.equal(false);
    expect(await receiver.reentryError()).to.equal(ethers.id("ReentrancyGuardReentrantCall()").slice(0, 10));
    expect(await project.fundsWithdrawn()).to.equal(true);
  });

  it("restores withdrawal state after a creator rejects ETH and allows retry", async function () {
    const { factory, alice, receiver, goal, deadline } = await loadFixture(receiverFixture);
    await receiver.createProject(await factory.getAddress(), goal, deadline);
    const project = await ethers.getContractAt("CrowdfundingProject", await receiver.project());
    await project.connect(alice).contribute({ value: goal });
    await receiver.configure(true, false);
    await time.increaseTo(deadline);
    await expect(receiver.withdrawFunds()).to.be.revertedWith("Fund transfer failed");
    expect(await project.fundsWithdrawn()).to.equal(false);
    expect(await project.getStatus()).to.equal(1);
    await receiver.configure(false, false);
    await expect(receiver.withdrawFunds()).to.changeEtherBalances([project, receiver], [-goal, goal]);
  });
});

describe("Reproducible transaction gas measurements", function () {
  it("measures a complete successful campaign and preserves its audit history", async function () {
    const { project, alice, goal, deadline, deploymentReceipt, creationReceipt } = await loadFixture(deployFixture);
    const first = await (await project.connect(alice).contribute({ value: goal / 2n })).wait();
    const repeat = await (await project.connect(alice).contribute({ value: goal / 2n })).wait();
    const update = await (await project.postUpdate("Funding target achieved.")).wait();
    await time.increaseTo(deadline);
    const withdrawal = await (await project.withdrawFunds()).wait();
    expect(await project.getStatus()).to.equal(3);
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(0);
    for (const [operation, receipt] of [
      ["factory deployment", deploymentReceipt], ["project creation", creationReceipt],
      ["first contribution", first], ["repeat contribution", repeat],
      ["project update", update], ["creator withdrawal", withdrawal]
    ]) {
      expect(receipt.status).to.equal(1);
      console.log(`    GAS | ${operation} | ${receipt.gasUsed.toString()}`);
    }
  });

  it("measures a failed-campaign refund and clears the escrow balance", async function () {
    const { project, alice, deadline } = await loadFixture(deployFixture);
    await project.connect(alice).contribute({ value: ethers.parseEther("1") });
    await time.increaseTo(deadline);
    const receipt = await (await project.connect(alice).refund()).wait();
    expect(receipt.status).to.equal(1);
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(0);
    expect((await project.getContribution(alice.address)).refunded).to.equal(true);
    console.log(`    GAS | contributor refund | ${receipt.gasUsed.toString()}`);
  });
});
