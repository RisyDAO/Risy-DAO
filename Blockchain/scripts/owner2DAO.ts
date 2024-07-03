import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import { ethers } from "hardhat";
import { RisyDAO } from "../typechain-types";

async function main() {
  // Get environment variables
  const risyDAOAddress = process.env.RISY_DAO_ADDRESS;
  const risyDAOManagerAddress = process.env.RISY_DAO_MANAGER_ADDRESS;

  if (!risyDAOAddress || !risyDAOManagerAddress) {
    console.error("Please provide the RisyDAO contract address and the new owner address in the .env file.");
    process.exit(1);
  }

  console.log("Starting DAO ownership transfer...");
  console.log("Risy DAO address:", risyDAOAddress);
  console.log("New owner address:", risyDAOManagerAddress);

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Executing with account:", deployer.address);

  // Get the RisyDAO contract instance
  const risyDAO = await ethers.getContractAt("RisyDAO", risyDAOAddress) as RisyDAO;

  // Check current owner
  const currentOwner = await risyDAO.owner();
  console.log("Current owner:", currentOwner);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("The current signer is not the owner of the RisyDAO contract.");
    process.exit(1);
  }

  // Transfer ownership
  console.log("Transferring ownership...");
  const tx = await risyDAO.transferOwnership(risyDAOManagerAddress);
  await tx.wait();

  // Verify new owner
  const newOwner = await risyDAO.owner();
  console.log("New owner:", newOwner);

  if (newOwner.toLowerCase() === risyDAOManagerAddress.toLowerCase()) {
    console.log("Ownership transfer successful!");
  } else {
    console.error("Ownership transfer failed. Please check the transaction and try again.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });