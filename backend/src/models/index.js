const { Sequelize } = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/database')[env];

const sequelize = new Sequelize(config);

// Import models
const Project = require('./Project')(sequelize);
const Contribution = require('./Contribution')(sequelize);
const ProjectUpdate = require('./ProjectUpdate')(sequelize);
const Transaction = require('./Transaction')(sequelize);

// Define relationships
Project.hasMany(Contribution, { foreignKey: 'projectAddress', sourceKey: 'address' });
Contribution.belongsTo(Project, { foreignKey: 'projectAddress', targetKey: 'address', as: 'project' });

Project.hasMany(ProjectUpdate, { foreignKey: 'projectAddress', sourceKey: 'address' });
ProjectUpdate.belongsTo(Project, { foreignKey: 'projectAddress', targetKey: 'address' });
Project.hasMany(Transaction, { foreignKey: 'projectAddress', sourceKey: 'address' });
Transaction.belongsTo(Project, { foreignKey: 'projectAddress', targetKey: 'address' });

module.exports = {
  sequelize,
  Project,
  Contribution,
  ProjectUpdate,
  Transaction,
};
