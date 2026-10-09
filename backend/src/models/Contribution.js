const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contribution = sequelize.define('Contribution', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contributor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    refunded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    transactionHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'contributions',
    timestamps: true,
    indexes: [
      { fields: ['projectAddress'] },
      { fields: ['contributor'] },
      { fields: ['projectAddress', 'contributor'] },
    ],
  });

  return Contribution;
};
