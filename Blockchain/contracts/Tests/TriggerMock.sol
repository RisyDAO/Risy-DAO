// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../ITrigger.sol";

contract TriggerMock is ITrigger {
    bool public called;
    address public lastFrom;
    address public lastTo;
    uint256 public lastAmount;
    address public lastOperator;
    bool public revertNext;

    function trigger(bytes calldata callData) external override {
        // If revertNext is set, revert
        if (revertNext) {
            revert("TriggerMock: revertNext");
        }

        // Check for special command
        if (callData.length == abi.encode("revert_next").length) {
            string memory command = abi.decode(callData, (string));
            if (keccak256(bytes(command)) == keccak256(bytes("revert_next"))) {
                revertNext = true;
                return;
            }
        }

        // Otherwise, set called to true and decode callData
        called = true;
        if (callData.length > 0) {
            (lastFrom, lastTo, lastAmount, lastOperator) = abi.decode(callData, (address, address, uint256, address));
        }
    }
}