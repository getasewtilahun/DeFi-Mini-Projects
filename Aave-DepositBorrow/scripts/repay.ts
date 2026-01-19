import hre from "hardhat";

async function main() {
  const network = hre.network.name;
  console.log(`Repaying tokens on ${network}...\n`);

  // Get contract address from environment
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS in your .env file");
  }

  // Get token address, amount, and interest rate mode from environment
  const assetAddress = process.env.ASSET_ADDRESS;
  const amount = process.env.AMOUNT || "max"; // "max" to repay all, or specific amount
  const interestRateMode = process.env.INTEREST_RATE_MODE || "2"; // 1 = stable, 2 = variable
  const onBehalfOf = process.env.ON_BEHALF_OF || undefined;

  if (!assetAddress) {
    throw new Error(
      "Please set ASSET_ADDRESS in your .env file.\n" +
      "Example:\n" +
      "ASSET_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (USDC)\n" +
      "AMOUNT=max (or specific amount like 1000000 for 1 USDC)\n" +
      "INTEREST_RATE_MODE=2 (1 for stable, 2 for variable)"
    );
  }

  const [signer] = await hre.ethers.getSigners();
  const userAddress = onBehalfOf || await signer.getAddress();
  
  console.log(`Signer: ${await signer.getAddress()}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Asset: ${assetAddress}`);
  console.log(`Amount: ${amount === "max" ? "MAX (repay all)" : amount}`);
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
  
  console.log(`Token: ${tokenSymbol} (${tokenDecimals} decimals)\n`);

  // Get user account data to check current debt
  const accountDataBefore = await aaveDepositBorrow.getUserAccountData(userAddress);
  const totalDebt = accountDataBefore[1];
  
  console.log(`Total Debt (Base): ${totalDebt.toString()}`);
  
  if (totalDebt === BigInt(0)) {
    throw new Error("No debt to repay.");
  }

  // Determine repayment amount
  let repayAmount: bigint;
  if (amount === "max") {
    repayAmount = hre.ethers.MaxUint256;
    console.log("Repaying all debt...");
  } else {
    repayAmount = BigInt(amount);
    const amountFormatted = hre.ethers.formatUnits(repayAmount, tokenDecimals);
    console.log(`Repaying ${amountFormatted} ${tokenSymbol}...`);
  }

  // Check balance
  const balance = await token.balanceOf(await signer.getAddress());
  const balanceFormatted = hre.ethers.formatUnits(balance, tokenDecimals);
  console.log(`Your balance: ${balanceFormatted} ${tokenSymbol}`);

  if (amount !== "max" && balance < repayAmount) {
    throw new Error(`Insufficient balance. You have ${balanceFormatted} ${tokenSymbol}`);
  }

  // Check allowance
  const allowance = await token.allowance(await signer.getAddress(), contractAddress);
  const allowanceFormatted = hre.ethers.formatUnits(allowance, tokenDecimals);
  console.log(`Current allowance: ${allowanceFormatted} ${tokenSymbol}`);

  if (allowance < repayAmount) {
    console.log(`\nApproving tokens...`);
    const approveTx = await token.approve(contractAddress, repayAmount);
    await approveTx.wait();
    console.log(`Approved! Tx: ${approveTx.hash}\n`);
  }

  // Repay tokens
  console.log(`Repaying debt...`);
  const tx = await aaveDepositBorrow.repay(
    assetAddress,
    repayAmount,
    interestRateMode,
    userAddress
  );
  console.log(`Transaction hash: ${tx.hash}`);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`\n✅ Successfully repaid debt!`);
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
