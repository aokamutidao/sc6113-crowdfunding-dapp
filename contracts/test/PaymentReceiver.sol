// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../CrowdfundingFactory.sol";

/**
 * @notice Test fixture only. Simulates a receiver that rejects ETH or tries to
 * re-enter a payment operation. It is not part of the application deployment.
 */
contract PaymentReceiver {
    CrowdfundingProject public project;
    bool public rejectPayment;
    bool public reenter;
    bool public reentrySucceeded;
    bytes4 public reentryError;
    bool private withdrawing;

    function createProject(CrowdfundingFactory factory, uint256 goal, uint256 deadline) external {
        project = CrowdfundingProject(factory.createProject(
            "Receiver campaign", "Campaign used for security tests", "Technology", goal, deadline
        ));
    }

    function contribute(CrowdfundingProject target) external payable {
        project = target;
        target.contribute{value: msg.value}();
    }

    function configure(bool reject, bool attack) external {
        rejectPayment = reject;
        reenter = attack;
    }

    function refund() external {
        withdrawing = false;
        project.refund();
    }

    function withdrawFunds() external {
        withdrawing = true;
        project.withdrawFunds();
    }

    receive() external payable {
        require(!rejectPayment, "Receiver rejects payment");
        if (reenter) {
            bytes memory result;
            (reentrySucceeded, result) = address(project).call(
                withdrawing
                    ? abi.encodeWithSelector(project.withdrawFunds.selector)
                    : abi.encodeWithSelector(project.refund.selector)
            );
            if (result.length >= 4) {
                bytes4 errorSelector;
                assembly {
                    errorSelector := mload(add(result, 32))
                }
                reentryError = errorSelector;
            }
        }
    }
}
