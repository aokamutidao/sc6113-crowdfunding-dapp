const { DataTypes } = require('sequelize');

// One row per canonical contract log. No wallet key or signed transaction is stored.
module.exports = sequelize => sequelize.define('Transaction', {
  id: { type: DataTypes.STRING, primaryKey: true },
  projectAddress: { type: DataTypes.STRING, allowNull: false },
  transactionHash: { type: DataTypes.STRING, allowNull: false },
  blockNumber: { type: DataTypes.INTEGER, allowNull: false },
  logIndex: { type: DataTypes.INTEGER, allowNull: false },
  eventName: { type: DataTypes.STRING, allowNull: false },
  actor: { type: DataTypes.STRING, allowNull: true },
  amount: { type: DataTypes.STRING, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  timestamp: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'confirmed' },
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [{ fields: ['projectAddress', 'blockNumber'] }, { fields: ['transactionHash'] }],
});
