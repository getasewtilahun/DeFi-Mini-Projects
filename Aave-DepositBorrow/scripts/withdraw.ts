import hre from "hardhat";

async function main() {
  const network = hre.network.name;
  console.log(`Withdrawing tokens on ${network}...\n`);

  // Get contract address from environment
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS in your .env file");
  }

  // Get token address and amount from environment
  const assetAddress = process.env.ASSET_ADDRESS;
  const amount = process.env.AMOUNT || "max"; // "max" to withdraw all, or specific amount
  const to = process.env.TO_ADDRESS || undefined;

  if (!assetAddress) {
    throw new Error(
      "Please set ASSET_ADDRESS in your .env file.\n" +
      "Example:\n" +
      "ASSET_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F (DAI)\n" +
      "AMOUNT=max (or specific amount like 1000000000000000000 for 1 DAI)\n" +
      "TO_ADDRESS=0x... (optional, defaults to signer address)"
    );
  }

  const [signer] = await hre.ethers.getSigners();
  const toAddress = to || await signer.getAddress();
  
  console.log(`Signer: ${await signer.getAddress()}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Asset: ${assetAddress}`);
  console.log(`Amount: ${amount === "max" ? "MAX (withdraw all)" : amount}`);
  console.log(`To: ${toAddress}\n`);

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

  // Get user account data to check available collateral
  const accountDataBefore = await aaveDepositBorrow.getUserAccountData(toAddress);
  const totalCollateral = accountDataBefore[0];
  const healthFactorBefore = accountDataBefore[5];
  
  console.log(`Total Collateral (Base): ${totalCollateral.toString()}`);
  console.log(`Health Factor: ${healthFactorBefore.toString()}\n`);
  
  if (totalCollateral === BigInt(0)) {
    throw new Error("No collateral to withdraw.");
  }

  // Determine withdrawal amount
  let withdrawAmount: bigint;
  if (amount === "max") {
    withdrawAmount = hre.ethers.MaxUint256;
    console.log("Withdrawing all available collateral...");
  } else {
    withdrawAmount = BigInt(amount);
    const amountFormatted = hre.ethers.formatUnits(withdrawAmount, tokenDecimals);
    console.log(`Withdrawing ${amountFormatted} ${tokenSymbol}...`);
  }

  // Withdraw tokens
  console.log(`Withdrawing from Aave...`);
  const tx = await aaveDepositBorrow.withdraw(
    assetAddress,
    withdrawAmount,
    toAddress
  );
  console.log(`Transaction hash: ${tx.hash}`);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`\n✅ Successfully withdrew tokens!`);
  console.log(`Block: ${receipt?.blockNumber}`);
  console.log(`Gas used: ${receipt?.gasUsed.toString()}`);

  // Get updated user account data
  const accountDataAfter = await aaveDepositBorrow.getUserAccountData(toAddress);
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
