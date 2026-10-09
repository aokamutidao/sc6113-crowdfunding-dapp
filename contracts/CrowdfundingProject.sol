// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrowdfundingProject
 * @dev Individual crowdfunding project contract
 * @notice This contract handles a single crowdfunding campaign
 */
contract CrowdfundingProject is ReentrancyGuard {
    // Project information
    address public creator;
    string public title;
    string public description;
    string public category;
    uint256 public goalAmount;
    uint256 public deadline;
    uint256 public totalRaised;
    bool public fundsWithdrawn;

    // Project status
    enum ProjectStatus { Active, Successful, Failed, FundsWithdrawn }

    // Contribution structure
    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
        bool refunded;
    }

    // Update structure for project updates (P1 feature)
    struct ProjectUpdate {
        string content;
        uint256 timestamp;
    }

    // State variables
    Contribution[] public contributions;
    mapping(address => uint256) public contributorIndex; // 1-indexed, 0 means not contributed
    ProjectUpdate[] public updates;

    // Events
    event Contributed(address indexed contributor, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed creator, uint256 amount, uint256 timestamp);
    event Refunded(address indexed contributor, uint256 amount, uint256 timestamp);
    event UpdatePosted(string content, uint256 timestamp);

    // Modifiers
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this function");
        _;
    }

    modifier projectActive() {
        require(getStatus() == ProjectStatus.Active, "Project is not active");
        _;
    }

    modifier projectSuccessful() {
        require(getStatus() == ProjectStatus.Successful, "Project is not successful");
        _;
    }

    modifier projectFailed() {
        require(getStatus() == ProjectStatus.Failed, "Project is not failed");
        _;
    }

    /**
     * @dev Constructor to initialize the project
     * @param _creator Address of the project creator
     * @param _title Project title
     * @param _description Project description
     * @param _category Project category
     * @param _goalAmount Funding goal in wei
     * @param _deadline Deadline timestamp
     */
    constructor(
        address _creator,
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _goalAmount,
        uint256 _deadline
    ) {
        require(_creator != address(0), "Invalid creator address");
        require(_goalAmount > 0, "Goal amount must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

        creator = _creator;
        title = _title;
        description = _description;
        category = _category;
        goalAmount = _goalAmount;
        deadline = _deadline;
        totalRaised = 0;
        fundsWithdrawn = false;
    }

    /**
     * @dev Contribute to the project
     */
    function contribute() external payable nonReentrant projectActive {
        require(msg.value > 0, "Contribution must be greater than 0");

        // Check if contributor already has a contribution
        if (contributorIndex[msg.sender] > 0) {
            // Update existing contribution
            uint256 index = contributorIndex[msg.sender] - 1;
            contributions[index].amount += msg.value;
            contributions[index].timestamp = block.timestamp;
        } else {
            // Add new contribution
            contributions.push(Contribution({
                contributor: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp,
                refunded: false
            }));
            contributorIndex[msg.sender] = contributions.length; // 1-indexed
        }

        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Withdraw funds (only creator, only when successful)
     */
    function withdrawFunds() external nonReentrant onlyCreator projectSuccessful {
        require(!fundsWithdrawn, "Funds already withdrawn");

        fundsWithdrawn = true;
        uint256 amount = totalRaised;

        (bool success, ) = payable(creator).call{value: amount}("");
        require(success, "Fund transfer failed");

        emit FundsWithdrawn(creator, amount, block.timestamp);
    }

    /**
     * @dev Refund contribution (only when project failed)
     */
    function refund() external nonReentrant projectFailed {
        require(contributorIndex[msg.sender] > 0, "No contribution found");

        uint256 index = contributorIndex[msg.sender] - 1;
        Contribution storage contribution = contributions[index];

        require(!contribution.refunded, "Already refunded");
        require(contribution.amount > 0, "No amount to refund");

        contribution.refunded = true;
        uint256 amount = contribution.amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit Refunded(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Post a project update (P1 feature)
     * @param _content Update content
     */
    function postUpdate(string memory _content) external onlyCreator {
        require(bytes(_content).length > 0, "Update content cannot be empty");

        updates.push(ProjectUpdate({
            content: _content,
            timestamp: block.timestamp
        }));

        emit UpdatePosted(_content, block.timestamp);
    }

    /**
     * @dev Get project status
     * @return ProjectStatus Current status
     */
    function getStatus() public view returns (ProjectStatus) {
        if (fundsWithdrawn) {
            return ProjectStatus.FundsWithdrawn;
        }

        if (block.timestamp < deadline) {
            return ProjectStatus.Active;
        }

        if (totalRaised >= goalAmount) {
            return ProjectStatus.Successful;
        }

        return ProjectStatus.Failed;
    }

    /**
     * @dev Get complete project information
     */
    function getProjectInfo() external view returns (
        address _creator,
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _goalAmount,
        uint256 _deadline,
        uint256 _totalRaised,
        ProjectStatus _status,
        bool _fundsWithdrawn,
        uint256 _contributionCount,
        uint256 _updateCount
    ) {
        return (
            creator,
            title,
            description,
            category,
            goalAmount,
            deadline,
            totalRaised,
            getStatus(),
            fundsWithdrawn,
            contributions.length,
            updates.length
        );
    }

    /**
     * @dev Get all contributions
     */
    function getContributions() external view returns (Contribution[] memory) {
        return contributions;
    }

    /**
     * @dev Get all updates (P1 feature)
     */
    function getUpdates() external view returns (ProjectUpdate[] memory) {
        return updates;
    }

    /**
     * @dev Get contribution by address
     * @param contributor Address of the contributor
     */
    function getContribution(address contributor) external view returns (
        uint256 amount,
        uint256 timestamp,
        bool refunded
    ) {
        if (contributorIndex[contributor] == 0) {
            return (0, 0, false);
        }

        uint256 index = contributorIndex[contributor] - 1;
        Contribution memory contribution = contributions[index];
        return (contribution.amount, contribution.timestamp, contribution.refunded);
    }

    /**
     * @dev Get number of contributors
     */
    function getContributorCount() external view returns (uint256) {
        return contributions.length;
    }

    /**
     * @dev Get progress percentage
     */
    function getProgressPercentage() external view returns (uint256) {
        if (goalAmount == 0) return 0;
        return (totalRaised * 100) / goalAmount;
    }

    /**
     * @dev Check if address is a contributor
     */
    function isContributor(address addr) external view returns (bool) {
        return contributorIndex[addr] > 0;
    }
}
