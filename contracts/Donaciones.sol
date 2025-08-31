// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Donaciones {
    event Donated(
        address indexed donor,
        address indexed recipient,
        uint256 amount,
        string message
    );

    mapping(address => uint256) public donatedBy;
    mapping(address => uint256) public receivedBy;
    uint256 public totalDonated;
    uint256 public donationsCount;

    address public owner;
    bool public paused;
    bool private locked;

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier nonReentrant() { require(!locked, "Reentrancy"); locked = true; _; locked = false; }

    constructor() {
        owner = msg.sender;
    }

    function setPaused(bool v) external onlyOwner {
        paused = v;
    }

    function donate(address payable recipient, string calldata message) external payable nonReentrant {
        require(!paused, "Paused");
        require(recipient != address(0), "Invalid recipient");
        require(msg.value > 0, "Zero amount");

        donatedBy[msg.sender] += msg.value;
        receivedBy[recipient] += msg.value;
        totalDonated += msg.value;
        donationsCount += 1;

        emit Donated(msg.sender, recipient, msg.value, message);

        (bool ok, ) = recipient.call{value: msg.value}("");
        require(ok, "Transfer failed");
    }

    receive() external payable {
        revert("Use donate()");
    }
}
