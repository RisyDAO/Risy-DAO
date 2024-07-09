# Risy DAO

Risy DAO is a revolutionary decentralized autonomous organization (DAO) built on the Polygon blockchain. It features a custom ERC20 token with advanced functionality and a governance system for decentralized decision-making, designed to solve common problems in the cryptocurrency space.

## Table of Contents

- [Features](#features)
- [Problem Solving](#problem-solving)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Governance](#governance)
- [Security](#security)
- [Future Development](#future-development)
- [Tokenomics](#tokenomics)
- [License](#license)
- [Contact](#contact)

## Features

- **Fully Decentralized**: Managed by KYC DAO (Owner is the DAO)
- **Capped Supply**: Maximum supply is 2x the initial supply
- **Daily Transfer Limit**: Whale protection mechanism based on a percentage of total balance (default 10%)
- **DAO Fee**: Fee on transfers for DAO maintenance, development, and marketing (default 0.1%)
- **ICO Max Balance Limit**: Whale protection mechanism to limit maximum token holdings (default 0.75% of total supply)
- **Trigger Mechanism**: For automation of tasks
- **Upgradeable**: Uses the UUPS proxy pattern for future upgrades
- **Governance**: Integrated with OpenZeppelin's Governor contract for decentralized decision-making

## Problem Solving

Risy DAO addresses several critical issues in the cryptocurrency space:

1. **Centralization**: Unlike many cryptocurrencies, Risy DAO is fully decentralized, with ownership and decision-making power distributed among token holders.

2. **Whale Manipulation**: The 10% daily transfer limit and 0.75% temporary hodl limit during ICO prevent large holders from manipulating the market.

3. **Unfair Token Distribution**: These limits also ensure a more equitable distribution of tokens over time.

4. **Sustainability**: The 0.1% DAO fee on transfers funds ongoing development, marketing, and community initiatives, making the project self-sustaining.

5. **Volatility**: By providing initial liquidity with 50% USDC and 50% PAXG, RISY maintains a correlation with both gold and USD, providing stability against market fluctuations.

6. **Scalability and Cost**: Built on the Polygon blockchain, Risy enables fast and affordable dApp development compared to Ethereum-based tokens.

7. **Continuous Improvement**: The DAO mechanism allows the project to evolve and upgrade itself indefinitely based on community decisions.

## Smart Contracts

1. `RisyDAO.sol`: Main contract for the Risy DAO Token
2. `RisyBase.sol`: Base contract with standard ERC20 functionality and upgradability
3. `RisyDAOManager.sol`: Governance contract for managing the DAO
4. `ITrigger.sol`: Interface for the trigger mechanism
5. `TriggerMock.sol`: Mock contract for testing the trigger functionality

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- Yarn or npm
- Hardhat

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/risy-dao.git
   cd risy-dao
   ```

2. Install dependencies:
   ```
   yarn install
   ```
   or
   ```
   npm install
   ```

3. Compile the contracts:
   ```
   npx hardhat compile
   ```

## Usage

### Deploying Contracts

To deploy the contracts to a network:

1. Set up your network configuration in `hardhat.config.ts`
2. Run the deployment script:
   ```
   npx hardhat run scripts/deploy.ts --network <network-name>
   ```

### Interacting with Contracts

You can interact with the deployed contracts using Hardhat tasks or by writing custom scripts. Here are some example interactions:

1. Transfer tokens:
   ```typescript
   const risyDAO = await ethers.getContractAt("RisyDAO", "CONTRACT_ADDRESS");
   await risyDAO.transfer("RECIPIENT_ADDRESS", ethers.parseUnits("100", 18));
   ```

2. Check balance:
   ```typescript
   const balance = await risyDAO.balanceOf("ADDRESS");
   console.log("Balance:", ethers.formatUnits(balance, 18));
   ```

3. Create a governance proposal:
   ```typescript
   const risyDAOManager = await ethers.getContractAt("RisyDAOManager", "MANAGER_ADDRESS");
   const encodedFunctionCall = risyDAO.interface.encodeFunctionData("setDAOFee", [100]);
   await risyDAOManager.propose(
     [risyDAO.address],
     [0],
     [encodedFunctionCall],
     "Proposal description"
   );
   ```

## Testing

To run the extensive test suite:

```
npx hardhat test
```

Our project features hundreds of carefully crafted tests covering various scenarios, ensuring the robustness and security of the smart contracts.

## Governance

Risy DAO uses a governance system based on OpenZeppelin's Governor contract. Key features include:

- Proposal creation and execution
- Voting mechanisms (For, Against, Abstain)
- Quorum requirements
- Time-based voting periods

Token holders can participate in governance by:
1. Delegating their voting power
2. Creating proposals (if they meet the proposal threshold)
3. Voting on active proposals

## Security

Security is a top priority for Risy DAO:

- The contract uses OpenZeppelin's battle-tested implementations as a foundation
- Upgrade functionality is restricted to the DAO through governance
- Daily transfer limits and max balance limits provide protection against large, malicious transactions
- Extensive test coverage ensures contract behavior under various conditions
- The project goes a professional security audit before mainnet deployment

## Future Development

Risy DAO has ambitious plans for future development:

1. **dApp Ecosystem**: We're planning to develop various decentralized applications, including games and financial tools, leveraging the fast and affordable Polygon Mainnet.

2. **Continuous Upgrades**: Thanks to the DAO mechanism, Risy can evolve indefinitely based on community decisions.

3. **Expanding Use Cases**: As the ecosystem grows, we aim to increase the utility and adoption of RISY tokens across different platforms and services.

## Tokenomics

- **Initial Supply**: 1,000,000,000,000 RISY
- **Maximum Supply**: 2x initial supply
- **Creator Holdings**: Only 2% of initial supply
- **Initial Liquidity**: $20,000 (50% USDC, 50% PAXG)
- **DAO Fee**: 0.1% on each transfer
- **Daily Transfer Limit**: 10% of balance
- **Temporary Hodl Limit for the ICO**: 0.75% during ICO

Key points:
- Correlation with both USD and gold provides stability
- DAO fee funds ongoing development and community initiatives
- Exemption of DEX buys from daily limits encourages purchasing (approximately 10:1 buy-to-sell ratio)
- Built on Polygon for fast and affordable transactions

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or support, please contact:

- Email: info@risy.io
- Website: [https://risy.io](https://risy.io)
- Twitter: [@RisyDAO](https://twitter.com/RisyDAO)
- Discord: [Risy DAO Community](https://discord.gg/JYz5EF9h5e)

Made with passion and coffee for blockchain nerds by the blockchain nerds. Rise with RISY!