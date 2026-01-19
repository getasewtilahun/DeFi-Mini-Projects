import hre from "hardhat";

async function main() {
  const network = hre.network.name;
  console.log(`Borrowing tokens on ${network}...\n`);

  // Get contract address from environment
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS in your .env file");
  }

  // Get token address, amount, and interest rate mode from environment
  const assetAddress = process.env.ASSET_ADDRESS;
  const amount = process.env.AMOUNT;
  const interestRateMode = process.env.INTEREST_RATE_MODE || "2"; // 1 = stable, 2 = variable
  const onBehalfOf = process.env.ON_BEHALF_OF || undefined;

  if (!assetAddress || !amount) {
    throw new Error(
      "Please set ASSET_ADDRESS and AMOUNT in your .env file.\n" +
      "Example:\n" +
      "ASSET_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (USDC)\n" +
      "AMOUNT=1000000 (1 USDC with 6 decimals)\n" +
      "INTEREST_RATE_MODE=2 (1 for stable, 2 for variable)"
    );
  }

  const [signer] = await hre.ethers.getSigners();
  const userAddress = onBehalfOf || await signer.getAddress();
  
  console.log(`Signer: ${await signer.getAddress()}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Asset: ${assetAddress}`);
  console.log(`Amount: ${amount}`);
  console.log(`Interest Rate Mode: ${interestRateMode} (${interestRateMode === "1" ? "Stable" : "Variable"})`);
  console.log(`On behalf of: ${userAddress}\n`);

  // Get contract instance
  const aaveDepositBorrow = await hre.ethers.getContractAt(
    "AaveDepositBorrow",
    contractAddress
  );

  // Get ERC20 token instance
  const token = await hre.ethers.getContractAt("IERC20", assetAddress);
  const tokenSymbol = await token.symbol().catch(() => "Unknown");
  const tokenDecimals = await token.decimals().catch(() => 18);
  const amountFormatted = hre.ethers.formatUnits(amount, tokenDecimals);
  
  console.log(`Token: ${tokenSymbol} (${tokenDecimals} decimals)`);
  console.log(`Amount: ${amountFormatted} ${tokenSymbol}\n`);

  // Check user account data before borrowing
  console.log("Checking account data...");
  const accountDataBefore = await aaveDepositBorrow.getUserAccountData(userAddress);
  const availableBorrows = accountDataBefore[2];
  const healthFactorBefore = accountDataBefore[5];
  
  console.log(`Available Borrows (Base): ${availableBorrows.toString()}`);
  console.log(`Health Factor: ${healthFactorBefore.toString()}\n`);

  if (availableBorrows === BigInt(0)) {
    throw new Error("No available borrows. You may need to deposit collateral first.");
  }

  // Borrow tokens
  console.log(`Borrowing ${amountFormatted} ${tokenSymbol} from Aave...`);
  const tx = await aaveDepositBorrow.borrow(
    assetAddress,
    amount,
    interestRateMode,
    userAddress
  );
  console.log(`Transaction hash: ${tx.hash}`);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`\n✅ Successfully borrowed ${amountFormatted} ${tokenSymbol}!`);
  console.log(`Block: ${receipt?.blockNumber}`);
  console.log(`Gas used: ${receipt?.gasUsed.toString()}`);

  // Get updated user account data
  const accountDataAfter = await aaveDepositBorrow.getUserAccountData(userAddress);
  console.log(`\n📊 Updated User Account Data:`);
  console.log(`Total Collateral (Base): ${accountDataAfter[0].toString()}`);
  console.log(`Total Debt (Base): ${accountDataAfter[1].toString()}`);
  console.log(`Available Borrows (Base): ${accountDataAfter[2].toString()}`);
  console.log(`Liquidation Threshold: ${accountDataAfter[3].toString()}`);
  console.log(`LTV: ${accountDataAfter[4].toString()}`);
  console.log(`Health Factor: ${accountDataAfter[5].toString()}`);
  
  if (accountDataAfter[5] < BigInt(10 ** 17)) {
    console.log(`\n⚠️  WARNING: Health factor is low! You may be at risk of liquidation.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
