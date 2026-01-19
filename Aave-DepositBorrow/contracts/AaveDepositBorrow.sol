// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IAaveOracle.sol";

/**
 * @title AaveDepositBorrow
 * @dev A mini dApp that allows users to deposit and borrow tokens from Aave V3
 */
contract AaveDepositBorrow {
    using SafeERC20 for IERC20;

    IPoolAddressesProvider public immutable addressesProvider;
    IPool public immutable pool;
    IAaveOracle public immutable oracle;

    // Mapping to track user deposits (informational only - not authoritative)
    // Note: Aave tracks actual balances via aTokens. These mappings are approximate
    // and don't account for interest accrual, liquidations, or direct Aave interactions.
    mapping(address => mapping(address => uint256)) public userDeposits;
    // Mapping to track user borrows (informational only - not authoritative)
    // Note: Aave tracks actual debt via debt tokens. These mappings are approximate
    // and don't account for interest accrual, liquidations, or direct Aave interactions.
    mapping(address => mapping(address => uint256)) public userBorrows;

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);

    /**
     * @dev Constructor initializes the Aave Pool Addresses Provider
     * @param _addressesProvider The address of the Aave Pool Addresses Provider
     */
    constructor(address _addressesProvider) {
        require(_addressesProvider != address(0), "Invalid addresses provider");
        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        pool = IPool(addressesProvider.getPool());
        oracle = IAaveOracle(addressesProvider.getPriceOracle());
    }

    /**
     * @dev Deposit tokens into Aave
     * @param asset The address of the asset to deposit
     * @param amount The amount to deposit
     * @param onBehalfOf The address that will receive the aTokens
     */
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external {
        require(asset != address(0), "Invalid asset address");
        require(amount > 0, "Amount must be greater than 0");
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");

        IERC20 token = IERC20(asset);
        
        // Transfer tokens from user to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve Aave Pool to spend tokens
        token.safeApprove(address(pool), amount);
        
        // Deposit to Aave
        pool.supply(asset, amount, onBehalfOf, 0);
        
        // Update user deposits tracking
        userDeposits[onBehalfOf][asset] += amount;

        emit Deposit(onBehalfOf, asset, amount);
    }

    /**
     * @dev Borrow tokens from Aave
     * @param asset The address of the asset to borrow
     * @param amount The amount to borrow
     * @param interestRateMode The interest rate mode (2 for variable, 1 for stable)
     * @param onBehalfOf The address that will receive the borrowed tokens
     */
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external {
        require(asset != address(0), "Invalid asset address");
        require(amount > 0, "Amount must be greater than 0");
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");
        require(
            interestRateMode == 1 || interestRateMode == 2,
            "Invalid interest rate mode"
        );

        // Borrow from Aave
        // Note: Aave automatically sends borrowed tokens directly to onBehalfOf
        // No manual transfer is needed or should be done
        pool.borrow(asset, amount, interestRateMode, 0, onBehalfOf);
        
        // Update user borrows tracking (informational only)
        userBorrows[onBehalfOf][asset] += amount;

        emit Borrow(onBehalfOf, asset, amount);
    }

    /**
     * @dev Repay borrowed tokens
     * @param asset The address of the asset to repay
     * @param amount The amount to repay (use type(uint256).max to repay all)
     * @param rateMode The interest rate mode (2 for variable, 1 for stable)
     * @param onBehalfOf The address whose debt will be repaid
     */
    function repay(
        address asset,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external {
        require(asset != address(0), "Invalid asset address");
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");
        require(
            rateMode == 1 || rateMode == 2,
            "Invalid interest rate mode"
        );

        IERC20 token = IERC20(asset);
        
        // If amount is max, get the current debt
        if (amount == type(uint256).max) {
            (, uint256 currentDebt, , , , ) = pool.getUserAccountData(onBehalfOf);
            amount = currentDebt;
        }

        // Transfer tokens from user to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve Aave Pool to spend tokens
        token.approve(address(pool), amount);
        
        // Repay to Aave
        pool.repay(asset, amount, rateMode, onBehalfOf);
        
        // Update user borrows tracking
        if (userBorrows[onBehalfOf][asset] >= amount) {
            userBorrows[onBehalfOf][asset] -= amount;
        } else {
            userBorrows[onBehalfOf][asset] = 0;
        }

        emit Repay(onBehalfOf, asset, amount);
    }

    /**
     * @dev Withdraw deposited tokens from Aave
     * @param asset The address of the asset to withdraw
     * @param amount The amount to withdraw (use type(uint256).max to withdraw all)
     * @param to The address that will receive the tokens
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external {
        require(asset != address(0), "Invalid asset address");
        require(to != address(0), "Invalid to address");

        // Withdraw from Aave
        uint256 withdrawnAmount = pool.withdraw(asset, amount, to);
        
        // Update user deposits tracking
        if (userDeposits[to][asset] >= withdrawnAmount) {
            userDeposits[to][asset] -= withdrawnAmount;
        } else {
            userDeposits[to][asset] = 0;
        }

        emit Withdraw(to, asset, withdrawnAmount);
    }

    /**
     * @dev Get user account data from Aave
     * @param user The address of the user
     * @return totalCollateralBase Total collateral in base currency
     * @return totalDebtBase Total debt in base currency
     * @return availableBorrowsBase Available borrows in base currency
     * @return currentLiquidationThreshold Current liquidation threshold
     * @return ltv Loan to value ratio
     * @return healthFactor Health factor
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return pool.getUserAccountData(user);
    }

    /**
     * @dev Get the reserve data for an asset
     * @param asset The address of the asset
     * @return The reserve data struct
     */
    function getReserveData(address asset)
        external
        view
        returns (DataTypes.ReserveData memory)
    {
        return pool.getReserveData(asset);
    }

    /**
     * @dev Get the price of an asset from Aave Oracle
     * @param asset The address of the asset
     * @return The price of the asset
     */
    function getAssetPrice(address asset) external view returns (uint256) {
        return oracle.getAssetPrice(asset);
    }
}
