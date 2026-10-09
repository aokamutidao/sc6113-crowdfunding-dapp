const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectUpdate = sequelize.define('ProjectUpdate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transactionHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'project_updates',
    timestamps: true,
    indexes: [
      { fields: ['projectAddress'] },
      { fields: ['timestamp'] },
    ],
  });

  return ProjectUpdate;
};
