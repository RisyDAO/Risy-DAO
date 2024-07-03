// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../ITrigger.sol";

contract TriggerMock is ITrigger {
    bool public called;

    function trigger() external override {
        called = true;
    }
}