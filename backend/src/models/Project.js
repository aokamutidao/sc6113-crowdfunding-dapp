const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    address: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    creator: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    goalAmount: {
      type: DataTypes.STRING, // Store as string to handle large numbers
      allowNull: false,
    },
    deadline: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalRaised: {
      type: DataTypes.STRING,
      defaultValue: '0',
    },
    status: {
      type: DataTypes.ENUM('active', 'successful', 'failed', 'fundsWithdrawn'),
      defaultValue: 'active',
    },
    fundsWithdrawn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    contributionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'projects',
    timestamps: true,
    indexes: [
      { fields: ['creator'] },
      { fields: ['category'] },
      { fields: ['status'] },
      { fields: ['deadline'] },
    ],
  });

  return Project;
};
