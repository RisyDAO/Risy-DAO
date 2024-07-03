// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20DailyLimit is Ownable, ERC20 {
    //Error for daily limit
    error ERC20DailyLimitError(address sender, uint256 transferredAmountToday, uint256 maxTransferAmount, uint256 remainingTransferLimit, uint256 percentTransferred);

    uint256 public timeWindow;
    uint256 public transferLimitPercent;

    uint256 private constant DEFAULT_TIME_WINDOW = 86400;
    uint256 private constant DEFAULT_TRANSFER_LIMIT_PERCENT = 10;

    mapping(address => mapping(uint256 => uint256)) private _transferred;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        uint256 timeWindow_,
        uint256 transferLimitPercent_
    ) Ownable(_msgSender()) ERC20(name_, symbol_) {
        _mint(_msgSender(), initialSupply_ * 10 ** decimals());

        timeWindow = timeWindow_ > 0 ? timeWindow_ : DEFAULT_TIME_WINDOW;
        transferLimitPercent = transferLimitPercent_ > 0 ? transferLimitPercent_ : DEFAULT_TRANSFER_LIMIT_PERCENT;
    }

    function _currentDay() internal view returns (uint256) {
        return block.timestamp / timeWindow;
    }

    function _updateDailyTransferLimit(address sender, uint256 amount) internal {
        uint256 currentDay = _currentDay();
        uint256 dailyLimit = (balanceOf(sender) * transferLimitPercent) / 100;

        if (_transferred[sender][currentDay] + amount > dailyLimit) {
            (uint256 transferredAmountToday, uint256 maxTransferAmount, uint256 remainingTransferLimit, uint256 percentTransferred) = getTransferLimitDetails(sender);
            revert ERC20DailyLimitError(sender, transferredAmountToday, maxTransferAmount, remainingTransferLimit, percentTransferred);
        }

        _transferred[sender][currentDay] += amount;
    }

    function _update(address from, address to, uint256 amount) internal override {
        super._update(from, to, amount);

        if (from != address(0) && to != address(0) && from != to && from != owner()) {
            _updateDailyTransferLimit(from, amount);
        }
    }

    function getTransferredAmountToday(address account) public view returns (uint256) {
        return _transferred[account][_currentDay()];
    }

    function getMaxTransferAmount(address account) public view returns (uint256) {
        return (balanceOf(account) * transferLimitPercent) / 100;
    }

    function getRemainingTransferLimit(address account) public view returns (uint256) {
        uint256 maxTransferAmount = getMaxTransferAmount(account);
        uint256 transferredAmountToday = getTransferredAmountToday(account);
        return maxTransferAmount > transferredAmountToday ? maxTransferAmount - transferredAmountToday : 0;
    }

    function getPercentTransferred(address account) public view returns (uint256) {
        uint256 maxTransferAmount = getMaxTransferAmount(account);
        return maxTransferAmount > 0 ? (getTransferredAmountToday(account) * 100) / maxTransferAmount : 0;
    }

    function getTransferLimitDetails(address account) public view returns (
        uint256 transferredAmountToday,
        uint256 maxTransferAmount,
        uint256 remainingTransferLimit,
        uint256 percentTransferred
    ) {
        transferredAmountToday = getTransferredAmountToday(account);
        maxTransferAmount = getMaxTransferAmount(account);
        remainingTransferLimit = getRemainingTransferLimit(account);
        percentTransferred = getPercentTransferred(account);
    }
}