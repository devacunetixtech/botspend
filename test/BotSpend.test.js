const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("BotSpend", function () {
  async function deployBotSpendFixture() {
    const [owner, agentOne, agentTwo] = await ethers.getSigners();
    const BotSpend = await ethers.getContractFactory("BotSpend");
    const botSpend = await BotSpend.deploy();

    return { botSpend, owner, agentOne, agentTwo };
  }

  it("registers a new agent profile", async function () {
    const { botSpend, agentOne } = await loadFixture(deployBotSpendFixture);

    await expect(
      botSpend.connect(agentOne).registerAgent("Data Agent", "Aggregates market intelligence")
    ).to.emit(botSpend, "AgentRegistered");

    const agent = await botSpend.getAgentByWallet(agentOne.address);
    expect(agent.name).to.equal("Data Agent");
    expect(agent.description).to.equal("Aggregates market intelligence");
    expect(agent.isActive).to.equal(true);
  });

  it("records direct payments to a registered agent", async function () {
    const { botSpend, owner, agentOne } = await loadFixture(deployBotSpendFixture);

    await botSpend.connect(agentOne).registerAgent("Data Agent", "Research and data feeds");

    await expect(
      botSpend.connect(owner).payAgent(agentOne.address, ethers.parseEther("0.75"), "market data", {
        value: ethers.parseEther("0.75"),
      })
    ).to.emit(botSpend, "PaymentSent");

    const paymentCount = await botSpend.getPaymentCount();
    expect(paymentCount).to.equal(1);

    const payment = await botSpend.getPayment(0);
    expect(payment.from).to.equal(owner.address);
    expect(payment.to).to.equal(agentOne.address);
    expect(payment.amount).to.equal(ethers.parseEther("0.75"));
  });

  it("creates and completes a service request", async function () {
    const { botSpend, owner, agentOne } = await loadFixture(deployBotSpendFixture);

    await botSpend.connect(agentOne).registerAgent("Data Agent", "On-chain research");

    const requestId = await botSpend.connect(owner).createServiceRequest(
      agentOne.address,
      "Need a market overview of bot chain signals",
      ethers.parseEther("0.5"),
      { value: ethers.parseEther("0.5") }
    );

    await requestId.wait();

    const request = await botSpend.getRequest(1);
    expect(request.provider).to.equal(agentOne.address);
    expect(request.requester).to.equal(owner.address);
    expect(request.completed).to.equal(false);

    await expect(botSpend.connect(agentOne).completeServiceRequest(1)).to.emit(
      botSpend,
      "ServiceRequestCompleted",
    );

    const updatedRequest = await botSpend.getRequest(1);
    expect(updatedRequest.completed).to.equal(true);
  });
});
