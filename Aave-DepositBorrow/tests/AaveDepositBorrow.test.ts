import { expect } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";

describe("AaveDepositBorrow", function () {
  let aaveDepositBorrow: any;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let addressesProvider: string;

  // Aave V3 Pool Addresses Provider for mainnet (for fork testing)
  const MAINNET_POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  
  // Common token addresses on mainnet
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();
    
    // Deploy the contract
    const AaveDepositBorrowFactory = await hre.ethers.getContractFactory("AaveDepositBorrow");
    aaveDepositBorrow = await AaveDepositBorrowFactory.deploy(MAINNET_POOL_ADDRESSES_PROVIDER);
    await aaveDepositBorrow.waitForDeployment();
    
    addressesProvider = MAINNET_POOL_ADDRESSES_PROVIDER;
  });

  describe("Deployment", function () {
    it("Should set the correct Pool Addresses Provider", async function () {
      expect(await aaveDepositBorrow.addressesProvider()).to.equal(MAINNET_POOL_ADDRESSES_PROVIDER);
    });

    it("Should revert with zero address for addresses provider", async function () {
      const AaveDepositBorrowFactory = await hre.ethers.getContractFactory("AaveDepositBorrow");
      await expect(
        AaveDepositBorrowFactory.deploy(hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid addresses provider");
    });
  });

  describe("Deposit", function () {
    it("Should revert with zero asset address", async function () {
      await expect(
        aaveDepositBorrow.deposit(hre.ethers.ZeroAddress, 1000, await user1.getAddress())
      ).to.be.revertedWith("Invalid asset address");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        aaveDepositBorrow.deposit(DAI, 0, await user1.getAddress())
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert with zero onBehalfOf address", async function () {
      await expect(
        aaveDepositBorrow.deposit(DAI, 1000, hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid onBehalfOf address");
    });

    // Note: Actual deposit tests would require:
    // 1. Forking mainnet
    // 2. Having tokens to deposit
    // 3. Approving the contract to spend tokens
    // These are integration tests that would need more setup
  });

  describe("Borrow", function () {
    it("Should revert with zero asset address", async function () {
      await expect(
        aaveDepositBorrow.borrow(hre.ethers.ZeroAddress, 1000, 2, await user1.getAddress())
      ).to.be.revertedWith("Invalid asset address");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        aaveDepositBorrow.borrow(USDC, 0, 2, await user1.getAddress())
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert with invalid interest rate mode", async function () {
      await expect(
        aaveDepositBorrow.borrow(USDC, 1000, 3, await user1.getAddress())
      ).to.be.revertedWith("Invalid interest rate mode");
    });

    it("Should revert with zero onBehalfOf address", async function () {
      await expect(
        aaveDepositBorrow.borrow(USDC, 1000, 2, hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid onBehalfOf address");
    });
  });

  describe("Repay", function () {
    it("Should revert with zero asset address", async function () {
      await expect(
        aaveDepositBorrow.repay(hre.ethers.ZeroAddress, 1000, 2, await user1.getAddress())
      ).to.be.revertedWith("Invalid asset address");
    });

    it("Should revert with invalid interest rate mode", async function () {
      await expect(
        aaveDepositBorrow.repay(USDC, 1000, 3, await user1.getAddress())
      ).to.be.revertedWith("Invalid interest rate mode");
    });

    it("Should revert with zero onBehalfOf address", async function () {
      await expect(
        aaveDepositBorrow.repay(USDC, 1000, 2, hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid onBehalfOf address");
    });
  });

  describe("Withdraw", function () {
    it("Should revert with zero asset address", async function () {
      await expect(
        aaveDepositBorrow.withdraw(hre.ethers.ZeroAddress, 1000, await user1.getAddress())
      ).to.be.revertedWith("Invalid asset address");
    });

    it("Should revert with zero to address", async function () {
      await expect(
        aaveDepositBorrow.withdraw(DAI, 1000, hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid to address");
    });
  });

  describe("View Functions", function () {
    it("Should get user account data", async function () {
      // This will return data even if user has no deposits/borrows
      const accountData = await aaveDepositBorrow.getUserAccountData(await user1.getAddress());
      expect(accountData).to.be.an("array");
      expect(accountData.length).to.equal(6);
    });

    it("Should get reserve data", async function () {
      const reserveData = await aaveDepositBorrow.getReserveData(DAI);
      expect(reserveData).to.be.an("object");
    });

    it("Should get asset price", async function () {
      const price = await aaveDepositBorrow.getAssetPrice(DAI);
      expect(price).to.be.a("bigint");
      expect(price).to.be.greaterThan(BigInt(0));
    });
  });
});
