# Aave Deposit & Borrow Mini-dApp

## Overview
This project demonstrates a mini DeFi dApp that interacts with Aave V3. Users will be able to:
- Deposit ERC20 tokens (e.g., DAI, USDC, WETH)
- Borrow ERC20 tokens against their collateral
- Repay borrowed tokens
- Withdraw deposited tokens
- Track balances, interest rates, and health factors

## Tech Stack
- **Solidity** ^0.8.20
- **TypeScript** - Type-safe development
- **Hardhat** - Development environment
- **OpenZeppelin Contracts** - Security-audited smart contract libraries
- **Aave Core V3** - Aave protocol interfaces
- **Ethers.js** - Ethereum library

## Features
- ✅ Deposit tokens into Aave V3 lending pool
- ✅ Borrow tokens using deposited collateral
- ✅ Repay borrowed tokens (full or partial)
- ✅ Withdraw deposited tokens
- ✅ View user account data (collateral, debt, health factor)
- ✅ Get asset prices from Aave Oracle
- ✅ Comprehensive unit tests

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- A wallet with testnet ETH (for deployment)
- Basic understanding of Solidity and DeFi

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Then fill in your values:
   ```env
   # Network RPC URLs
   GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_KEY
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
   
   # Private key (without 0x prefix)
   PRIVATE_KEY=your_private_key_here
   
   # Etherscan API key (for contract verification)
   ETHERSCAN_API_KEY=your_etherscan_api_key
   
   # Optional: Custom Aave Pool Addresses Provider
   AAVE_POOL_ADDRESSES_PROVIDER=0x...
   
   # For interaction scripts (set after deployment)
   CONTRACT_ADDRESS=0x...
   ASSET_ADDRESS=0x...
   AMOUNT=1000000000000000000
   INTEREST_RATE_MODE=2
   ```

## Usage

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Lint Code
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

### Deploy to Local Network
```bash
npx hardhat node
# In another terminal:
npm run deploy
```

### Deploy to Goerli Testnet
```bash
npm run deploy:goerli
```

> **Note:** The `predeploy` script automatically runs tests before deployment to ensure everything passes. This is a professional best practice.

### Deploy to Sepolia Testnet
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Interaction Scripts

After deploying the contract, you can use the provided scripts to interact with it. Set the following environment variables in your `.env` file:

```env
# Contract address (from deployment)
CONTRACT_ADDRESS=0x...

# For supply/borrow/repay/withdraw operations
ASSET_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F  # DAI example
AMOUNT=1000000000000000000  # 1 token (adjust decimals accordingly)
INTEREST_RATE_MODE=2  # 1 for stable, 2 for variable (for borrow/repay)
ON_BEHALF_OF=0x...  # Optional, defaults to signer address
TO_ADDRESS=0x...  # Optional, for withdraw (defaults to signer)
```

### Supply (Deposit) Tokens
```bash
# Supply on Goerli
npm run supply

# Supply on Sepolia
npm run supply:sepolia
```

**Example:**
```bash
CONTRACT_ADDRESS=0x... ASSET_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F AMOUNT=1000000000000000000 npm run supply
```

### Borrow Tokens
```bash
# Borrow on Goerli
npm run borrow

# Borrow on Sepolia
npm run borrow:sepolia
```

**Example:**
```bash
CONTRACT_ADDRESS=0x... ASSET_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 AMOUNT=1000000 INTEREST_RATE_MODE=2 npm run borrow
```

### Repay Borrowed Tokens
```bash
# Repay on Goerli
npm run repay

# Repay on Sepolia
npm run repay:sepolia
```

**Example (repay all):**
```bash
CONTRACT_ADDRESS=0x... ASSET_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 AMOUNT=max INTEREST_RATE_MODE=2 npm run repay
```

### Withdraw Deposited Tokens
```bash
# Withdraw on Goerli
npm run withdraw

# Withdraw on Sepolia
npm run withdraw:sepolia
```

**Example (withdraw all):**
```bash
CONTRACT_ADDRESS=0x... ASSET_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F AMOUNT=max npm run withdraw
```

## Contract Functions

### `deposit(address asset, uint256 amount, address onBehalfOf)`
Deposit tokens into Aave V3. The user must approve this contract to spend their tokens first.

**Parameters:**
- `asset`: Address of the token to deposit (e.g., DAI, USDC)
- `amount`: Amount of tokens to deposit
- `onBehalfOf`: Address that will receive the aTokens

### `borrow(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf)`
Borrow tokens from Aave V3. Requires sufficient collateral.

**Note:** Aave automatically sends borrowed tokens directly to `onBehalfOf`. No manual transfer is performed.

**Parameters:**
- `asset`: Address of the token to borrow
- `amount`: Amount to borrow
- `interestRateMode`: 1 for stable rate, 2 for variable rate
- `onBehalfOf`: Address that will receive the borrowed tokens (Aave sends tokens here automatically)

### `repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)`
Repay borrowed tokens. Use `type(uint256).max` to repay all debt.

**Parameters:**
- `asset`: Address of the token to repay
- `amount`: Amount to repay (or `type(uint256).max` for all)
- `rateMode`: 1 for stable rate, 2 for variable rate
- `onBehalfOf`: Address whose debt will be repaid

### `withdraw(address asset, uint256 amount, address to)`
Withdraw deposited tokens from Aave V3.

**Parameters:**
- `asset`: Address of the token to withdraw
- `amount`: Amount to withdraw (or `type(uint256).max` for all)
- `to`: Address that will receive the tokens

### View Functions

- `getUserAccountData(address user)`: Returns user's total collateral, debt, available borrows, LTV, liquidation threshold, and health factor
- `getReserveData(address asset)`: Returns reserve data for an asset
- `getAssetPrice(address asset)`: Returns the price of an asset from Aave Oracle

## Aave V3 Pool Addresses Provider

The contract uses the Aave V3 Pool Addresses Provider to interact with the protocol. Default addresses:

- **Mainnet**: `0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e`
- **Goerli**: `0xc4dCB5126a3AfEd129BCc8e4600E4DC2F3399415`
- **Sepolia**: `0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A`

## Example Usage Flow

1. **Approve tokens:**
   ```javascript
   const token = await ethers.getContractAt("IERC20", DAI_ADDRESS);
   await token.approve(contractAddress, amount);
   ```

2. **Deposit:**
   ```javascript
   await aaveDepositBorrow.deposit(DAI_ADDRESS, amount, userAddress);
   ```

3. **Borrow:**
   ```javascript
   await aaveDepositBorrow.borrow(USDC_ADDRESS, borrowAmount, 2, userAddress);
   ```

4. **Check health factor:**
   ```javascript
   const accountData = await aaveDepositBorrow.getUserAccountData(userAddress);
   console.log("Health Factor:", accountData.healthFactor);
   ```

5. **Repay:**
   ```javascript
   await token.approve(contractAddress, repayAmount);
   await aaveDepositBorrow.repay(USDC_ADDRESS, repayAmount, 2, userAddress);
   ```

## Important Notes

### On-Chain Balance Tracking

⚠️ **The `userDeposits` and `userBorrows` mappings are informational only and not authoritative.**

**Why?**
- Aave tracks actual balances via **aTokens** (for deposits) and **debt tokens** (for borrows)
- Interest accrues continuously, which these mappings don't account for
- Liquidations can change balances without updating these mappings
- Users can interact directly with Aave, bypassing this contract

**For production use:**
- Always read actual balances from Aave's data providers or aToken/debt token balances
- Use `getUserAccountData()` for authoritative account information
- These mappings are useful for demos and learning, but should not be relied upon for critical operations

### Borrow Function Behavior

The `borrow()` function does not manually transfer tokens. Aave's `pool.borrow()` automatically sends borrowed tokens directly to the `onBehalfOf` address. This is the correct and expected behavior.

## Security Considerations

- Always verify contract addresses before interacting
- Check health factor before borrowing to avoid liquidation
- Use testnets for testing before mainnet deployment
- Never share your private key or commit it to version control
- Review Aave V3 documentation for current protocol parameters
- For production, always query Aave's on-chain data for authoritative balances

## Testing

The test suite includes:
- Deployment tests
- Input validation tests
- View function tests

For integration tests with actual deposits/borrows, you'll need to:
1. Fork mainnet using Hardhat
2. Have test tokens available
3. Set up proper approvals

## Resources

- [Aave V3 Documentation](https://docs.aave.com/developers/)
- [Aave V3 GitHub](https://github.com/aave/aave-v3-core)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)

## License

MIT
