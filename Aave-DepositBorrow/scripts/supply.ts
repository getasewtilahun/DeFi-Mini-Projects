import hre from "hardhat";

async function main() {
  const network = hre.network.name;
  console.log(`Supplying tokens on ${network}...\n`);

  // Get contract address from environment or use default
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS in your .env file");
  }

  // Get token address and amount from environment
  const assetAddress = process.env.ASSET_ADDRESS;
  const amount = process.env.AMOUNT;
  const onBehalfOf = process.env.ON_BEHALF_OF || undefined;

  if (!assetAddress || !amount) {
    throw new Error(
      "Please set ASSET_ADDRESS and AMOUNT in your .env file.\n" +
      "Example:\n" +
      "ASSET_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F (DAI)\n" +
      "AMOUNT=1000000000000000000 (1 token with 18 decimals)"
    );
  }

  const [signer] = await hre.ethers.getSigners();
  const userAddress = onBehalfOf || await signer.getAddress();
  
  console.log(`Signer: ${await signer.getAddress()}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Asset: ${assetAddress}`);
  console.log(`Amount: ${amount}`);
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

  // Check balance
  const balance = await token.balanceOf(await signer.getAddress());
  console.log(`Your balance: ${hre.ethers.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
  
  if (balance < BigInt(amount)) {
    throw new Error(`Insufficient balance. You have ${hre.ethers.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
  }

  // Check allowance
  const allowance = await token.allowance(await signer.getAddress(), contractAddress);
  console.log(`Current allowance: ${hre.ethers.formatUnits(allowance, tokenDecimals)} ${tokenSymbol}`);

  if (allowance < BigInt(amount)) {
    console.log(`\nApproving ${amountFormatted} ${tokenSymbol}...`);
    const approveTx = await token.approve(contractAddress, amount);
    await approveTx.wait();
    console.log(`Approved! Tx: ${approveTx.hash}\n`);
  }

  // Supply tokens
  console.log(`Supplying ${amountFormatted} ${tokenSymbol} to Aave...`);
  const tx = await aaveDepositBorrow.deposit(assetAddress, amount, userAddress);
  console.log(`Transaction hash: ${tx.hash}`);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`\n✅ Successfully supplied ${amountFormatted} ${tokenSymbol}!`);
  console.log(`Block: ${receipt?.blockNumber}`);
  console.log(`Gas used: ${receipt?.gasUsed.toString()}`);

  // Get updated user account data
  try {
    const accountData = await aaveDepositBorrow.getUserAccountData(userAddress);
    console.log(`\n📊 User Account Data:`);
    console.log(`Total Collateral (Base): ${accountData[0].toString()}`);
    console.log(`Total Debt (Base): ${accountData[1].toString()}`);
    console.log(`Available Borrows (Base): ${accountData[2].toString()}`);
    console.log(`Liquidation Threshold: ${accountData[3].toString()}`);
    console.log(`LTV: ${accountData[4].toString()}`);
    console.log(`Health Factor: ${accountData[5].toString()}`);
  } catch (error) {
    console.log("Could not fetch account data");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
