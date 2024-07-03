import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import {
  RisyDAO__factory,
  RisyDAO,
  RisyDAOManager__factory,
  RisyDAOManager,
  TriggerMock__factory,
  TriggerMock
} from "../typechain-types";

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Risy DAO Standard Functionality", function () {
  let ContractFactory: RisyDAO__factory;
  let instance: RisyDAO;
  let signers: HardhatEthersSigner[];
  let owner: HardhatEthersSigner;
  let decimals: bigint;

  describe("ERC20: Core tests", function () {
    beforeEach(async function () {
      signers = await ethers.getSigners();
      ContractFactory = await ethers.getContractFactory("RisyDAO") as RisyDAO__factory;
      owner = signers[0];
      instance = await upgrades.deployProxy(ContractFactory, [owner.address, 0]) as unknown as RisyDAO;
      await instance.waitForDeployment();
      decimals = await instance.decimals();
    });
  
    it("Test initial creation of contract", async function () {
      expect(await instance.name()).to.equal("Risy DAO");
      expect(decimals).to.equal(18);
      expect(await instance.totalSupply()).to.equal(ethers.parseUnits("1000000000000", decimals));
      expect(await instance.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000000000000", decimals));
    });
  
    it("Test transfers, approvals, and allowances", async function () {
      let recipient = signers[1];
      let spender = signers[2];
      let ownerFirstBalance = await instance.balanceOf(owner.address);
  
      await instance.connect(owner).transfer(recipient.address, 1000);
      expect(await instance.balanceOf(recipient.address)).to.equal(1000);
  
      await expect(instance.connect(spender).transferFrom(owner.address, recipient.address, 1000))
        .to.be.revertedWithCustomError(instance, "ERC20InsufficientAllowance");
  
      await instance.connect(owner).approve(spender.address, 1000);
      await instance.connect(spender).transferFrom(owner.address, recipient.address, 1000);
      expect(await instance.balanceOf(recipient.address)).to.equal(2000);
  
      await expect(instance.connect(owner).transfer(recipient.address, ownerFirstBalance))
        .to.be.revertedWithCustomError(instance, "ERC20InsufficientBalance");
    });
  
    it("Test minting and burning", async function () {
      let ownerFirstBalance = await instance.balanceOf(owner.address);
  
      await expect(instance.connect(owner).burn(ethers.parseUnits("1", 0) + ownerFirstBalance))
        .to.be.revertedWithCustomError(instance, "ERC20InsufficientBalance");

      await instance.connect(owner).burn(ownerFirstBalance);
    });
  
    it("Test capped supply", async function () {
      let recipient = signers[1];
      let cap = await instance.cap();
      let totalSupply = await instance.totalSupply();
  
      await expect(instance.connect(owner).mint(recipient.address, cap - totalSupply + ethers.parseUnits("1", 0)))
        .to.be.revertedWithCustomError(instance, "ERC20ExceededCap");
  
      await instance.connect(owner).mint(recipient.address, cap - totalSupply);
      expect(await instance.totalSupply()).to.equal(cap);
    });
  
    it("Test pausing and unpausing", async function () {
      let recipient = signers[1];
  
      await instance.connect(owner).pause();
      await expect(instance.connect(owner).transfer(recipient.address, 1000))
        .to.be.revertedWithCustomError(instance, "EnforcedPause");
  
      await instance.connect(owner).unpause();
      await instance.connect(owner).transfer(recipient.address, 1000);
      expect(await instance.balanceOf(recipient.address)).to.equal(1000);
    });
  
    it("Test permit", async function () {
      const spender = signers[1];
      
      const domain = {
        name: await instance.name(),
        version: '1',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await instance.getAddress()
      };
  
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };
  
      const value = 1000;
      const nonce = await instance.nonces(owner.address);
      const deadline = ethers.MaxUint256;
  
      const permit = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce,
        deadline
      };
  
      const signature = await owner.signTypedData(domain, types, permit);
      const { v, r, s } = ethers.Signature.from(signature);
  
      await instance.permit(permit.owner, permit.spender, permit.value, permit.deadline, v, r, s);
  
      expect(await instance.allowance(owner.address, spender.address)).to.equal(value);
  
      await instance.connect(spender).transferFrom(owner.address, spender.address, value);
  
      expect(await instance.allowance(owner.address, spender.address)).to.equal(0);

      await expect(instance.permit(permit.owner, permit.spender, permit.value, permit.deadline, v, r, s))
        .to.be.revertedWithCustomError(instance, "ERC2612InvalidSigner");

      // Check balances
      expect(await instance.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000000000000", decimals) - ethers.parseUnits(value.toString(), 0));
      expect(await instance.balanceOf(spender.address)).to.equal(value);
    });
  });

  describe("ERC20: Owner DAO Permission and Upgrade Tests", function () {
    let recipient: HardhatEthersSigner;

    beforeEach(async function () {
      recipient = signers[1];
      instance = await upgrades.deployProxy(ContractFactory, [owner.address, 0]) as unknown as RisyDAO;
      await instance.waitForDeployment();
    });

    it("Minting only works for owner", async function () {
      await expect(instance.connect(recipient).mint(recipient.address, 1000))
        .to.be.revertedWithCustomError(instance, "OwnableUnauthorizedAccount");

      await instance.connect(owner).mint(recipient.address, 1000);
      expect(await instance.balanceOf(recipient.address)).to.equal(1000);
    });

    it("Pausing and unpausing only works for owner", async function () {
      await expect(instance.connect(recipient).pause())
        .to.be.revertedWithCustomError(instance, "OwnableUnauthorizedAccount");

      await instance.connect(owner).pause();
      
      await expect(instance.connect(recipient).unpause())
        .to.be.revertedWithCustomError(instance, "OwnableUnauthorizedAccount");

      await instance.connect(owner).unpause();
    });

    it("Only owner is able to upgrade the UUPS contract", async function () {
      const RisyDAOFactory = await ethers.getContractFactory("RisyDAO");

      // Deploy using Hardhat's upgradeProxy function
      upgrades.validateImplementation(RisyDAOFactory);
      upgrades.validateUpgrade(await instance.getAddress(), RisyDAOFactory);
      upgrades.prepareUpgrade(await instance.getAddress(), RisyDAOFactory);
      const upgradedInstance = await upgrades.upgradeProxy(instance, RisyDAOFactory) as unknown as RisyDAO;
      await upgradedInstance.waitForDeployment();

      expect(await instance.owner()).to.equal(owner.address);
      expect(await instance.getVersion()).to.equal(2);

      // Manually deploy a new implementation contract
      const newImplementation = await RisyDAOFactory.deploy() as unknown as RisyDAO;
      await newImplementation.waitForDeployment();
  
      await expect(instance.connect(recipient).upgradeToAndCall(await newImplementation.getAddress(), "0x"))
        .to.be.revertedWithCustomError(instance, "OwnableUnauthorizedAccount");
  
      await instance.connect(owner).upgradeToAndCall(await newImplementation.getAddress(), "0x");

      expect(await instance.owner()).to.equal(owner.address);
      expect(await instance.getVersion()).to.equal(3);
    });
  });

  describe("ERC20: RisyDAO Voting and Delegation Tests", function () {
    let voter1: HardhatEthersSigner, voter2: HardhatEthersSigner;
  
    beforeEach(async function () {
      voter1 = signers[1];
      voter2 = signers[2];
      const RisyDAOFactory = await ethers.getContractFactory("RisyDAO");
      instance = await upgrades.deployProxy(RisyDAOFactory, [owner.address, 0]) as unknown as RisyDAO;
      await instance.waitForDeployment();
  
      // Mint some tokens to voters for testing (100 and 50 tokens respectively)
      await instance.mint(voter1.address, 100);
      await instance.mint(voter2.address, 50);
    });
  
    it("Should allow self-delegation", async function () {
      await instance.connect(voter1).delegate(voter1.address);
      expect(await instance.getVotes(voter1.address)).to.equal(100);
    });
  
    it("Should allow delegation to another address", async function () {
      await instance.connect(voter1).delegate(voter2.address);
      expect(await instance.getVotes(voter2.address)).to.equal(100);
      expect(await instance.getVotes(voter1.address)).to.equal(0);
    });
  
    it("Should update voting power when tokens are transferred", async function () {
      await instance.connect(voter1).delegate(voter1.address);
      await instance.connect(voter2).delegate(voter2.address);
  
      expect(await instance.getVotes(voter1.address)).to.equal(100);
      expect(await instance.getVotes(voter2.address)).to.equal(50);
  
      await instance.connect(voter1).transfer(voter2.address, 5);
  
      expect(await instance.getVotes(voter1.address)).to.equal(95);
      expect(await instance.getVotes(voter2.address)).to.equal(55);
    });
  
    it("Should allow checking voting power at a past timestamp", async function () {
      await instance.connect(voter1).delegate(voter1.address);

      const blockBefore = await ethers.provider.getBlock("latest");
      const timestampBefore = blockBefore!.timestamp;
  
      // Increase time by 1 hour (3600 seconds)
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []); // Mine a new block
  
      await instance.connect(voter1).transfer(voter2.address, 5);
  
      const blockAfter = await ethers.provider.getBlock("latest");
      const timestampAfter = blockAfter!.timestamp;
  
      // Wait for a short time to ensure the blockchain has processed the transfer
      await ethers.provider.send("evm_mine", []); // Mine another block
  
      // Use the timestamp from before the transfer for the first check
      expect(await instance.getPastVotes(voter1.address, timestampBefore)).to.equal(100);
      
      // Use the timestamp right after the transfer for the second check
      expect(await instance.getPastVotes(voter1.address, timestampAfter)).to.equal(95);
    });
  
    it("Should return the correct number of checkpoints", async function () {
      await instance.connect(voter1).delegate(voter1.address);
      await instance.connect(voter1).transfer(voter2.address, 3);
      await instance.connect(voter1).transfer(voter2.address, 2);
  
      expect(await instance.numCheckpoints(voter1.address)).to.equal(3);
    });
  });
});

describe("Risy DAO Advanced Features", function () {
  let ContractFactory: RisyDAO__factory;
  let instance: RisyDAO;
  let signers: HardhatEthersSigner[];
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let decimals: bigint;

  beforeEach(async function () {
    signers = await ethers.getSigners();
    ContractFactory = await ethers.getContractFactory("RisyDAO") as RisyDAO__factory;
    [owner, user1, user2, user3] = signers;
    instance = await upgrades.deployProxy(ContractFactory, [owner.address, 0]) as unknown as RisyDAO;
    await instance.waitForDeployment();
    decimals = await instance.decimals();

    // Mint some tokens to users for testing
    await instance.connect(owner).mint(user1.address, ethers.parseUnits("1000", decimals));
    await instance.connect(owner).mint(user2.address, ethers.parseUnits("1000", decimals));
  });

  describe("ERC20: Daily Transfer Limit", function () {
    it("should enforce daily transfer limit", async function () {
      const transferLimit = await instance.getTransferLimit();
      const timeWindow = transferLimit[0];
      const transferLimitPercent = transferLimit[1];

      // Calculate max transferable amount (10% of balance by default)
      let maxTransferable = (await instance.balanceOf(user1.address) * transferLimitPercent) / ethers.parseUnits("1", decimals);

      // Transfer at the limit should succeed
      await instance.connect(user1).transfer(user2.address, maxTransferable);

      // Transfer exceeding the limit should fail
      await expect(instance.connect(user1).transfer(user2.address, 1))
        .to.be.revertedWithCustomError(instance, "ERC20DailyLimitError");

      // Wait for the time window to pass
      await ethers.provider.send("evm_increaseTime", [Number(timeWindow)]);
      await ethers.provider.send("evm_mine", []);

      // Check if new transferable is set
      maxTransferable = (await instance.balanceOf(user1.address) * transferLimitPercent) / ethers.parseUnits("1", decimals);

      // Transfer should now succeed
      await expect(instance.connect(user1).transfer(user2.address, maxTransferable))
        .to.not.be.reverted;

      await expect(instance.connect(user1).transfer(user2.address, 1))
        .to.be.revertedWithCustomError(instance, "ERC20DailyLimitError");
    });

    it("should allow owner to set transfer limit", async function () {
      await instance.connect(owner).setTransferLimit(43200, ethers.parseUnits("0.20", decimals)); // 12 hours, 20%
      const newLimit = await instance.getTransferLimit();
      expect(newLimit[0]).to.equal(43200);
      expect(newLimit[1]).to.equal(ethers.parseUnits("0.20", decimals));
    });
  });

  describe("ERC20: DAO Fee on Transfer", function () {
    it("should apply DAO fee on transfer", async function () {
      const initialOwnerBalance = await instance.balanceOf(owner.address);
      const transferAmount = ethers.parseUnits("100", decimals);

      await instance.connect(user1).transfer(user2.address, transferAmount);

      const daoFee = await instance.getDAOFee();
      const expectedFee = (transferAmount * daoFee) / ethers.parseUnits("1", decimals);

      expect(await instance.balanceOf(owner.address)).to.equal(initialOwnerBalance + expectedFee);
    });

    it("should allow owner to set DAO fee", async function () {
      await instance.connect(owner).setDAOFee(ethers.parseUnits("0.5", decimals)); // 0.5%
      expect(await instance.getDAOFee()).to.equal(ethers.parseUnits("0.5", decimals));
    });
  });

  describe("ERC20: Max Balance Limit", function () {
    it("should enforce max balance limit", async function () {
      // Set max balance to 0.75% of initial supply
      await instance.connect(owner).setMaxBalance((ethers.parseUnits("0.075", decimals) * ethers.parseUnits("1000000000000",18)) / ethers.parseUnits("1", decimals));
      // Set dao fee to 0.01%
      await instance.connect(owner).setDAOFee(ethers.parseUnits("0.001", decimals));

      const maxBalance = await instance.getMaxBalance();
      const daoFee = ethers.parseUnits("75075075075075075075075075", 0); // Cumulative dao fee over max balance (0.75% of initial supply)
      const excessAmount = maxBalance + ethers.parseUnits("1", 0) + daoFee;

      // Mint tokens to reach just to max balance - 1
      await instance.connect(owner).mint(user1.address, maxBalance - await instance.balanceOf(user1.address) - ethers.parseUnits("1", 0));

      // Transfer should succeed
      await expect(instance.connect(user2).transfer(user1.address, 1))
        .to.not.be.reverted;

      // Transfer exceeding max balance should fail
      await expect(instance.connect(user2).transfer(user1.address, 1))
        .to.be.revertedWithCustomError(instance, "ERC20MaxBalanceLimitError");

      // Just enough to bypass daily limit
      await instance.connect(owner).mint(user1.address, excessAmount * ethers.parseUnits("9", 0) + ethers.parseUnits("1", 0) + daoFee);

      // Clean up user2's balance
      await instance.connect(user2).transfer(owner.address, await instance.balanceOf(user2.address));

      // Transfer exceeding max balance should fail
      await expect(instance.connect(user1).transfer(user2.address, excessAmount))
        .to.be.revertedWithCustomError(instance, "ERC20MaxBalanceLimitError");

      // -1 Should succeed
      await expect(instance.connect(user1).transfer(user2.address, excessAmount - ethers.parseUnits("1", 0)))
      .to.not.be.reverted;

      // Transfer from the owner account using excessing amount to an empty wallet should succeed
      await expect(instance.connect(owner).transfer(user3.address, excessAmount))
        .to.not.be.reverted;
    });

    it("should allow owner to set max balance", async function () {
      const newMaxBalance = ethers.parseUnits("2000000", decimals);
      await instance.connect(owner).setMaxBalance(newMaxBalance);
      expect(await instance.getMaxBalance()).to.equal(newMaxBalance);
    });
  });

  describe("ERC20: Trigger Mechanism", function () {
    let triggerMock: TriggerMock;

    beforeEach(async function () {
      const TriggerMockFactory = await ethers.getContractFactory("TriggerMock") as TriggerMock__factory;
      triggerMock = await TriggerMockFactory.deploy() as TriggerMock;
      await triggerMock.waitForDeployment();

      await instance.connect(owner).setTrigger(await triggerMock.getAddress());
    });

    it("should call trigger on transfer", async function () {
      await instance.connect(user1).transfer(user2.address, 1);
      expect(await triggerMock.called()).to.be.true;
    });

    it("should allow owner to set trigger", async function () {
      const newTrigger = ethers.Wallet.createRandom().address;
      await instance.connect(owner).setTrigger(newTrigger);
      expect(await instance.getTrigger()).to.equal(newTrigger);
    });
  });

  describe("ERC20: Whitelist Functionality", function () {
    it("should bypass limits for whitelisted addresses", async function () {
      await instance.connect(owner).setWhiteList(user1.address, true);

      const transferAmount = await instance.balanceOf(user1); // An amount exceeding 10% of balance (daily limit)

      // Be sure transfer amount exceeds daily limit
      expect(transferAmount).to.be.greaterThan((await instance.getTransferLimit())[1]);

      // Transfer exceeding daily limit should succeed for whitelisted address
      await expect(instance.connect(user1).transfer(user2.address, transferAmount))
        .to.not.be.reverted;

      // Whitelist status should be queryable
      expect(await instance.isWhiteListed(user1.address)).to.be.true;
      expect(await instance.isWhiteListed(user2.address)).to.be.false;
    });

    it("should allow owner to set whitelist status", async function () {
      await instance.connect(owner).setWhiteList(user2.address, true);
      expect(await instance.isWhiteListed(user2.address)).to.be.true;

      await instance.connect(owner).setWhiteList(user2.address, false);
      expect(await instance.isWhiteListed(user2.address)).to.be.false;
    });
  });
});


describe("Risy DAO Management Features", function () {
  let RisyDAOFactory: RisyDAO__factory;
  let RisyDAOManagerFactory: RisyDAOManager__factory;
  let risyDAO: RisyDAO;
  let risyDAOManager: RisyDAOManager;
  let signers: HardhatEthersSigner[];
  let owner: HardhatEthersSigner;
  let proposer: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;
  let nonVoter: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000000000", 18);
  const VOTING_DELAY = 1 * 24 * 60 * 60; // 1 day in seconds
  const VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days in seconds
  const PROPOSAL_THRESHOLD = ethers.parseUnits("1000000000", 18); // 1 billion tokens

  beforeEach(async function () {
    signers = await ethers.getSigners();
    [owner, proposer, voter1, voter2, voter3, nonVoter] = signers;

    RisyDAOFactory = await ethers.getContractFactory("RisyDAO") as RisyDAO__factory;
    risyDAO = await upgrades.deployProxy(RisyDAOFactory, [owner.address, 0]) as unknown as RisyDAO;
    await risyDAO.waitForDeployment();

    // Connect
    risyDAO.connect(owner);

    // Distribute tokens to voters (increased amounts)
    await risyDAO.transfer(proposer.address, PROPOSAL_THRESHOLD);
    await risyDAO.transfer(voter1.address, ethers.parseUnits("4000000000", 18));
    await risyDAO.transfer(voter2.address, ethers.parseUnits("3000000000", 18));
    await risyDAO.transfer(voter3.address, ethers.parseUnits("3000000000", 18));

    // Deploy RisyDAOManager
    RisyDAOManagerFactory = await ethers.getContractFactory("RisyDAOManager") as RisyDAOManager__factory;
    risyDAOManager = await RisyDAOManagerFactory.deploy(await risyDAO.getAddress());
    await risyDAOManager.waitForDeployment();

    // Delegate voting power
    await risyDAO.connect(proposer).delegate(proposer.address);
    await risyDAO.connect(voter1).delegate(voter1.address);
    await risyDAO.connect(voter2).delegate(voter2.address);
    await risyDAO.connect(voter3).delegate(voter3.address);

    // Transfer ownership of RisyDAO to RisyDAOManager
    await risyDAO.connect(owner).transferOwnership(await risyDAOManager.getAddress());
  });

  describe("Governor: Initialization", function () {
    it("should set the correct token address", async function () {
      expect(await risyDAOManager.token()).to.equal(await risyDAO.getAddress());
    });

    it("should set the correct voting delay", async function () {
      expect(await risyDAOManager.votingDelay()).to.equal(VOTING_DELAY);
    });

    it("should set the correct voting period", async function () {
      expect(await risyDAOManager.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("should set the correct proposal threshold", async function () {
      expect(await risyDAOManager.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
    });
  });

  describe("Governor: Ownership Transfer", function () {
    it("should transfer ownership of RisyDAO to RisyDAOManager", async function () {
      expect(await risyDAO.owner()).to.equal(await risyDAOManager.getAddress());
    });

    it("should not allow direct calls to owner-only functions after transfer", async function () {
      await expect(risyDAO.connect(owner).setDAOFee(100))
        .to.be.revertedWithCustomError(risyDAO, "OwnableUnauthorizedAccount");
    });

    it("should allow governance to call owner-only functions", async function () {
      const proposalDescription = "Set DAO Fee to 100";
      const encodedFunctionCall = risyDAO.interface.encodeFunctionData("setDAOFee", [100]);
  
      const proposeTx = await risyDAOManager.connect(proposer).propose(
        [await risyDAO.getAddress()],
        [0],
        [encodedFunctionCall],
        proposalDescription
      );
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt!.logs[0].args![0];
  
      // Move to active state
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);
  
      // Check proposal state
      expect(await risyDAOManager.state(proposalId)).to.equal(1); // Active
  
      // Vote
      await risyDAOManager.connect(voter1).castVote(proposalId, 1); // 4B
      await risyDAOManager.connect(voter2).castVote(proposalId, 1); // 3B
      await risyDAOManager.connect(voter3).castVote(proposalId, 1); // 3B
      // Total votes: 10B Quorum: 1% of 1T = 10B (Barely passes)
  
      // Move to end of voting period
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD]);
      await ethers.provider.send("evm_mine", []);
  
      expect(await risyDAOManager.state(proposalId)).to.equal(4); // Succeeded
      // Execute
      await risyDAOManager.execute(
        [await risyDAO.getAddress()],
        [0],
        [encodedFunctionCall],
        ethers.id(proposalDescription)
      );

      expect(await risyDAO.getDAOFee()).to.equal(100);
    });
  });

  describe("Governor: Advanced Proposal Scenarios", function () {
    let proposalId: bigint;
    const proposalDescription = "Proposal #1: Store 123 in the DAO";

    beforeEach(async function () {
      const encodedFunctionCall = risyDAO.interface.encodeFunctionData("setDAOFee", [123]);
      const tx = await risyDAOManager.connect(proposer).propose(
        [await risyDAO.getAddress()],
        [0],
        [encodedFunctionCall],
        proposalDescription
      );
      const receipt = await tx.wait();
      proposalId = receipt!.logs[0].args![0];
    });

    it("should allow cancelling a proposal", async function () {
      const encodedFunctionCall = risyDAO.interface.encodeFunctionData("setDAOFee", [123]);
      await risyDAOManager.connect(proposer).cancel(
        [await risyDAO.getAddress()],
        [0],
        [encodedFunctionCall],
        ethers.id(proposalDescription)
      );
      expect(await risyDAOManager.state(proposalId)).to.equal(2); // Canceled
    });

    it("should not allow changing votes", async function () {
      // Move to active state
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);

      await risyDAOManager.connect(voter1).castVote(proposalId, 1); // For
      expect(await risyDAOManager.hasVoted(proposalId, voter1.address)).to.be.true;

      await expect(risyDAOManager.connect(voter1).castVote(proposalId, 0)) // Against
        .to.be.revertedWithCustomError(risyDAOManager, "GovernorAlreadyCastVote");
    });

    it("should handle different voting options correctly", async function () {
      // Move to active state
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);

      await risyDAOManager.connect(voter1).castVote(proposalId, 1); // For
      await risyDAOManager.connect(voter2).castVote(proposalId, 0); // Against
      await risyDAOManager.connect(voter3).castVote(proposalId, 2); // Abstain

      const proposal = await risyDAOManager.proposalVotes(proposalId);
      expect(proposal.forVotes).to.equal(await risyDAO.getPastVotes(voter1.address, await risyDAOManager.proposalSnapshot(proposalId)));
      expect(proposal.againstVotes).to.equal(await risyDAO.getPastVotes(voter2.address, await risyDAOManager.proposalSnapshot(proposalId)));
      expect(proposal.abstainVotes).to.equal(await risyDAO.getPastVotes(voter3.address, await risyDAOManager.proposalSnapshot(proposalId)));
    });
  });

  describe("Governor: Governance Thresholds", function () {
    it("should not allow proposals below threshold", async function () {
      // 10% of balance to bypass daily limit and to voter1 to bypass max balance limit
      await risyDAO.connect(proposer).transfer(voter1.address, await risyDAO.balanceOf(proposer.address) / ethers.parseUnits("10",0));
      await expect(risyDAOManager.connect(proposer).propose(
        [await risyDAO.getAddress()],
        [0],
        [risyDAO.interface.encodeFunctionData("setDAOFee", [123])],
        "Proposal below threshold"
      )).to.be.revertedWithCustomError(risyDAOManager, "GovernorInsufficientProposerVotes");
    });

    it("should not pass a proposal if quorum is not reached", async function () {
      const proposalId = await createProposal();
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);

      // Only voter3 votes, which is not enough for quorum
      await risyDAOManager.connect(voter3).castVote(proposalId, 1);

      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD]);
      await ethers.provider.send("evm_mine", []);

      expect(await risyDAOManager.state(proposalId)).to.equal(3); // Defeated
    });
  });

  describe("Governor: Voting Restrictions", function () {
    it("should non-token holders to vote zero", async function () {
      const proposalId = await createProposal();
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);

      await risyDAOManager.connect(nonVoter).castVote(proposalId, 1);

      // Check votes of proposal, should be 0
      const proposal = await risyDAOManager.proposalVotes(proposalId);
      expect(proposal.forVotes).to.equal(0);
    });
  });

  describe("Governor: View Functions", function () {
    let proposalId: bigint;

    beforeEach(async function () {
      proposalId = await createProposal();
    });

    it("should return correct proposal deadline", async function () {
      const proposalCreatedAt = await risyDAOManager.proposalSnapshot(proposalId);
      const deadline = await risyDAOManager.proposalDeadline(proposalId);
      expect(deadline).to.equal(proposalCreatedAt + BigInt(VOTING_PERIOD));
    });

    it("should return correct vote power at different timestamps", async function () {
      const initialVotePower = await risyDAO.getVotes(voter1.address);

      await risyDAO.connect(voter1).transfer(voter2.address, ethers.parseUnits("50000000", 18));
      await risyDAO.connect(voter2).delegate(voter2.address);

      // Increase time to ensure a new timestamp
      await ethers.provider.send("evm_increaseTime", [60]); // 1 minute
      await ethers.provider.send("evm_mine", []);

      const newVotePower = await risyDAO.getVotes(voter1.address);

      expect(newVotePower).to.be.lessThan(initialVotePower);
    });
  });

  // Helper function to create a proposal
  async function createProposal(): Promise<bigint> {
    const tx = await risyDAOManager.connect(proposer).propose(
      [await risyDAO.getAddress()],
      [0],
      [risyDAO.interface.encodeFunctionData("setDAOFee", [123])],
      "Test Proposal"
    );
    const receipt = await tx.wait();
    return receipt!.logs[0].args![0];
  }
});

describe("Risy DAO Edge Cases and Interactions", function () {
  let ContractFactory: RisyDAO__factory;
  let instance: RisyDAO;
  let signers: HardhatEthersSigner[];
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let decimals: bigint;

  beforeEach(async function () {
    signers = await ethers.getSigners();
    ContractFactory = await ethers.getContractFactory("RisyDAO") as RisyDAO__factory;
    [owner, user1, user2, user3] = signers;
    instance = await upgrades.deployProxy(ContractFactory, [owner.address, 0]) as unknown as RisyDAO;
    await instance.waitForDeployment();
    decimals = await instance.decimals();

    // Mint some tokens to users for testing
    await instance.connect(owner).mint(user1.address, ethers.parseUnits("999", decimals));
    await instance.connect(owner).mint(user2.address, ethers.parseUnits("999", decimals));
    await instance.connect(owner).mint(user3.address, ethers.parseUnits("999", decimals));
  });

  describe("ERC20: Risy DAO Daily Limit Edge Cases", function () {
    it("should reset daily limit exactly at the time window boundary", async function () {
      const [timeWindow, transferLimitPercent] = await instance.getTransferLimit();
      const initialBalance = await instance.balanceOf(user1.address);
      const maxTransferable = (initialBalance * transferLimitPercent) / ethers.parseUnits("1", decimals);

      // Transfer maximum allowed amount
      await instance.connect(user1).transfer(user2.address, maxTransferable);

      // Try to transfer 1 token (should fail)
      await expect(instance.connect(user1).transfer(user2.address, 1))
        .to.be.revertedWithCustomError(instance, "ERC20DailyLimitError");

      // Move time forward to exactly the time window boundary
      await ethers.provider.send("evm_increaseTime", [Number(timeWindow)]);
      await ethers.provider.send("evm_mine", []);

      // Transfer should now succeed
      await expect(instance.connect(user1).transfer(user2.address, 1))
        .to.not.be.reverted;
    });

    it("should handle multiple transfers within daily limit correctly", async function () {
      const [, transferLimitPercent] = await instance.getTransferLimit();
      const initialBalance = await instance.balanceOf(user1.address);
      const maxTransferable = (initialBalance * transferLimitPercent) / ethers.parseUnits("1", decimals);

      // Perform multiple transfers
      const transfer1 = maxTransferable / 3n;
      const transfer2 = maxTransferable / 3n;
      const transfer3 = maxTransferable / 3n;

      await instance.connect(user1).transfer(user2.address, transfer1);
      await instance.connect(user1).transfer(user2.address, transfer2);
      await instance.connect(user1).transfer(user2.address, transfer3);

      // Try to transfer 1 more token (should fail)
      await expect(instance.connect(user1).transfer(user2.address, 1))
        .to.be.revertedWithCustomError(instance, "ERC20DailyLimitError");
    });
  });
});