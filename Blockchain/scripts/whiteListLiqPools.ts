import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import { ethers } from "hardhat";
import { RisyDAO } from "../typechain-types";

async function main() {
  // Get environment variables
  const risyDAOAddress = process.env.RISY_DAO_ADDRESS;
  const usdcRisyPairAddress = process.env.USDCRISY_PAIR_ADDRESS
  const paxgRisyPairAddress = process.env.PAXGRISY_PAIR_ADDRESS

  if (!risyDAOAddress || !usdcRisyPairAddress || !paxgRisyPairAddress) {
    console.error("Please provide all required addresses in the .env file.");
    process.exit(1);
  }

  console.log("Whitelisting liquidity pools...");

  // Get the signer (owner)
  const [owner] = await ethers.getSigners();
  console.log("Executing with account:", owner.address);

  // Get contract instances
  const risyDAO = await ethers.getContractAt("RisyDAO", risyDAOAddress) as RisyDAO;

  // Whitelist pool addresses
  console.log("Whitelisting pool address of USDC-RISY pair...");
  await risyDAO.setWhiteList(usdcRisyPairAddress, true);
  console.log("Whitelisting pool address of PAXG-RISY pair...");
  await risyDAO.setWhiteList(paxgRisyPairAddress, true);

  console.log("Liquidity pools whitelist setup completed!");

  // Log and check final states using isWhiteListed
  console.log("Final whitelist status:");
  console.log("- USDC-RISY pair:", await risyDAO.isWhiteListed(usdcRisyPairAddress));
  console.log("- PAXG-RISY pair:", await risyDAO.isWhiteListed(paxgRisyPairAddress));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });