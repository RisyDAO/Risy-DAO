// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../ITrigger.sol";

contract TriggerMock is ITrigger {
    bool public called;
    bool public revertNext;
    bytes4 public lastSignature;

    address public lastOperator;
    address public lastFrom;
    address public lastTo;

    uint256 public lastAmount;

    function trigger(bytes calldata data) external override {
        // If revertNext is set, revert
        if (revertNext) {
            revert("TriggerMock: revertNext");
        }

        // Check for special command
        if (data.length == abi.encode("revert_next").length) {
            string memory command = abi.decode(data, (string));
            if (keccak256(bytes(command)) == keccak256(bytes("revert_next"))) {
                revertNext = true;
                return;
            }
        }

        // Otherwise, mark as called and decode data
        called = true;

        // Do we have a signature?
        if (data.length >= 4) {
            assembly {
                let clean := and(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFF, sload(lastSignature.slot))
                let put := shr(208, calldataload(data.offset))
                sstore(lastSignature.slot, or(clean,put))
            }
            // We have got the signature to decide algorithm
            if(lastSignature == 0xa9059cbb) {
                // Triggered from transfer, we have enough data, decode the remaining values normally
                (, lastOperator, lastFrom, lastTo, lastAmount) = abi.decode(data, (bytes4, address, address, address, uint256));
            }
        }
    }
}