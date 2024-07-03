import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import { ethers, upgrades } from "hardhat";
import { RisyDAO } from "../typechain-types";

async function main() {
  // Get environment variables
  const risyDAOAddress = process.env.RISY_DAO_ADDRESS;

  if (!risyDAOAddress) {
    console.error("Please provide the RisyDAO contract address in the .env file.");
    process.exit(1);
  }

  console.log("Starting RisyDAO contract upgrade...");
  console.log("Current RisyDAO address:", risyDAOAddress);

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Executing upgrade with account:", deployer.address);

  // Get the current implementation
  const currentRisyDAO = await ethers.getContractAt("RisyDAO", risyDAOAddress) as RisyDAO;
  const currentVersion = await currentRisyDAO.getVersion();
  console.log("Current contract version:", currentVersion.toString());

  // Deploy the new implementation
  console.log("Deploying new implementation...");
  const RisyDAOFactory = await ethers.getContractFactory("RisyDAO");
  
  console.log("Preparing upgrade...");
  const upgradedRisyDAO = await upgrades.upgradeProxy(risyDAOAddress, RisyDAOFactory);
  await upgradedRisyDAO.waitForDeployment();

  console.log("Upgrade successful!");
  console.log("RisyDAO upgraded at address:", await upgradedRisyDAO.getAddress());

  // Verify the new version
  const newVersion = await upgradedRisyDAO.getVersion();
  console.log("New contract version:", newVersion.toString());

  if (newVersion > currentVersion) {
    console.log("Version increment verified. Upgrade completed successfully!");
  } else {
    console.warn("Warning: Version did not increment as expected. Please verify the upgrade manually.");
  }

  // Log additional information
  console.log("\nAdditional steps:");
  console.log("1. Verify the new implementation contract on the block explorer");
  console.log("2. Review and test the upgraded contract's functionality");
  console.log("3. Update any dependent contracts or dApps to use the new features/interface if necessary");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });