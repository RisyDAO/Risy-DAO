import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import { ethers, upgrades } from "hardhat";
import { RisyDAO, RisyDAOManager } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy RisyDAO
  const RisyDAOFactory = await ethers.getContractFactory("RisyDAO");
  const risyDAO = await upgrades.deployProxy(RisyDAOFactory, [deployer.address, 0]) as unknown as RisyDAO;
  await risyDAO.waitForDeployment();

  console.log("RisyDAO deployed to:", await risyDAO.getAddress());

  // Log initial configuration
  const transferLimit = await risyDAO.getTransferLimit();
  const daoFee = await risyDAO.getDAOFee();
  const maxBalance = await risyDAO.getMaxBalance();

  console.log("Initial configuration:");
  console.log("- Transfer limit time window:", transferLimit[0].toString(), "seconds");
  console.log("- Transfer limit percent:", ethers.formatUnits(transferLimit[1], 18));
  console.log("- DAO fee:", ethers.formatUnits(daoFee, 18));
  console.log("- Max balance:", ethers.formatUnits(maxBalance, 18));

  // Deploy RisyDAOManager
  const RisyDAOManagerFactory = await ethers.getContractFactory("RisyDAOManager");
  const risyDAOManager = await RisyDAOManagerFactory.deploy(await risyDAO.getAddress()) as RisyDAOManager;
  await risyDAOManager.waitForDeployment();

  console.log("RisyDAOManager deployed to:", await risyDAOManager.getAddress());

  // Commented out ownership transfer - user can decide when to do this
  // console.log("To transfer ownership of RisyDAO to RisyDAOManager, call:");
  // console.log(`await risyDAO.transferOwnership("${await risyDAOManager.getAddress()}");`);

  // Additional setup steps
  console.log("\nAdditional setup steps:");
  console.log("1. Whitelist and set up liquidity pool (50% USDC, 50% PAXG)");
  console.log("2. Set up trigger mechanism if needed");
  console.log("3. Transfer ownership to RisyDAOManager when ready");

  console.log("\nDeployment completed. Please perform additional setup steps manually.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });