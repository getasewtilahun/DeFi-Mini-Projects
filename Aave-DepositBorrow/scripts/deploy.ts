import hre from "hardhat";

// Aave V3 Pool Addresses Provider addresses for different networks
const POOL_ADDRESSES_PROVIDER: Record<string, string> = {
  mainnet: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
  goerli: "0xc4dCB5126a3AfEd129BCc8e4600E4DC2F3399415",
  sepolia: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A",
  polygon: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
  arbitrum: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
  optimism: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
};

async function main() {
  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  // Get the Pool Addresses Provider address for the current network
  let addressesProviderAddress = POOL_ADDRESSES_PROVIDER[network];
  
  if (!addressesProviderAddress) {
    // Try to get from environment variable
    addressesProviderAddress = process.env.AAVE_POOL_ADDRESSES_PROVIDER || "";
    
    if (!addressesProviderAddress) {
      throw new Error(
        `No Pool Addresses Provider address found for network ${network}. ` +
        `Please set AAVE_POOL_ADDRESSES_PROVIDER in your .env file or add it to the script.`
      );
    }
  }

  console.log(`Using Pool Addresses Provider: ${addressesProviderAddress}`);

  // Deploy the contract
  const AaveDepositBorrow = await hre.ethers.getContractFactory("AaveDepositBorrow");
  const aaveDepositBorrow = await AaveDepositBorrow.deploy(addressesProviderAddress);

  await aaveDepositBorrow.waitForDeployment();
  const contractAddress = await aaveDepositBorrow.getAddress();

  console.log(`AaveDepositBorrow deployed to: ${contractAddress}`);
  console.log(`Network: ${network}`);
  console.log(`Pool Addresses Provider: ${addressesProviderAddress}`);

  // Verify contract on Etherscan (if on a supported network)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    const deploymentTx = aaveDepositBorrow.deploymentTransaction();
    if (deploymentTx) {
      await deploymentTx.wait(6);
    }

    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [addressesProviderAddress],
      });
      console.log("Contract verified on Etherscan!");
    } catch (error: any) {
      console.log("Error verifying contract:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
