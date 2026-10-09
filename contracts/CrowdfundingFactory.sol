// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CrowdfundingProject.sol";

/**
 * @title CrowdfundingFactory
 * @dev Factory contract for creating and managing crowdfunding projects
 * @notice This contract creates new crowdfunding projects and maintains a registry
 */
contract CrowdfundingFactory {
    // All projects created through this factory
    address[] public allProjects;

    // User's created projects
    mapping(address => address[]) public userProjects;

    // Category-based projects (P1 feature)
    mapping(string => address[]) public categoryProjects;

    // Project ID counter
    uint256 private projectCounter;

    // Events
    event ProjectCreated(
        address indexed projectAddress,
        address indexed creator,
        uint256 indexed projectId,
        string title,
        string category,
        uint256 goalAmount,
        uint256 deadline
    );

    /**
     * @dev Create a new crowdfunding project
     * @param title Project title
     * @param description Project description
     * @param category Project category
     * @param goalAmount Funding goal in wei
     * @param deadline Deadline timestamp
     * @return projectAddress Address of the newly created project
     */
    function createProject(
        string memory title,
        string memory description,
        string memory category,
        uint256 goalAmount,
        uint256 deadline
    ) external returns (address projectAddress) {
        // Validation
        require(bytes(title).length >= 5, "Title must be at least 5 characters");
        require(bytes(title).length <= 100, "Title must be at most 100 characters");
        require(bytes(description).length >= 10, "Description must be at least 10 characters");
        require(bytes(description).length <= 1000, "Description must be at most 1000 characters");
        require(bytes(category).length > 0, "Category cannot be empty");
        require(goalAmount >= 0.01 ether, "Goal amount must be at least 0.01 ETH");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(deadline <= block.timestamp + 90 days, "Deadline cannot exceed 90 days");

        // Create new project
        CrowdfundingProject newProject = new CrowdfundingProject(
            msg.sender,
            title,
            description,
            category,
            goalAmount,
            deadline
        );

        projectAddress = address(newProject);

        // Store project
        allProjects.push(projectAddress);
        userProjects[msg.sender].push(projectAddress);
        categoryProjects[category].push(projectAddress);

        // Increment counter
        projectCounter++;

        // Emit event
        emit ProjectCreated(
            projectAddress,
            msg.sender,
            projectCounter,
            title,
            category,
            goalAmount,
            deadline
        );

        return projectAddress;
    }

    /**
     * @dev Get all projects
     * @return Array of all project addresses
     */
    function getAllProjects() external view returns (address[] memory) {
        return allProjects;
    }

    /**
     * @dev Get projects by category (P1 feature)
     * @param category Category name
     * @return Array of project addresses in the category
     */
    function getProjectsByCategory(string memory category) external view returns (address[] memory) {
        return categoryProjects[category];
    }

    /**
     * @dev Get user's created projects
     * @param user User address
     * @return Array of project addresses created by the user
     */
    function getUserProjects(address user) external view returns (address[] memory) {
        return userProjects[user];
    }

    /**
     * @dev Get total number of projects
     * @return Total project count
     */
    function getProjectCount() external view returns (uint256) {
        return allProjects.length;
    }

    /**
     * @dev Get project address by index
     * @param index Project index
     * @return Project address
     */
    function getProjectByIndex(uint256 index) external view returns (address) {
        require(index < allProjects.length, "Index out of bounds");
        return allProjects[index];
    }

    /**
     * @dev Get all available categories
     * @return Array of category names (P1 feature - simplified version)
     */
    function getAvailableCategories() external pure returns (string[] memory) {
        string[] memory categories = new string[](8);
        categories[0] = "Technology";
        categories[1] = "Education";
        categories[2] = "Charity";
        categories[3] = "Art";
        categories[4] = "Environment";
        categories[5] = "Health";
        categories[6] = "Business";
        categories[7] = "Other";
        return categories;
    }
}
