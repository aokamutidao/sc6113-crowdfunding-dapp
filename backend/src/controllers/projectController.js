const { Project, Contribution, ProjectUpdate, Transaction } = require('../models');
const { blockchainService } = require('../services/blockchainService');
const { AppError } = require('../middleware/errorHandler');

// Get all projects
exports.getAllProjects = async (req, res, next) => {
  try {
    const { status, category, sortBy = 'createdAt', order = 'DESC' } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const projects = await Project.findAll({
      where,
      order: [[sortBy, order]],
    });

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// Get project by address
exports.getProjectByAddress = async (req, res, next) => {
  try {
    const { address } = req.params;

    const project = await Project.findByPk(address);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// Get project contributions
exports.getProjectContributions = async (req, res, next) => {
  try {
    const { address } = req.params;

    const project = await Project.findByPk(address);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const contributions = await Contribution.findAll({
      where: { projectAddress: address },
      order: [['timestamp', 'DESC']],
    });

    res.json({
      success: true,
      count: contributions.length,
      data: contributions,
    });
  } catch (error) {
    next(error);
  }
};

// Get project updates
exports.getProjectUpdates = async (req, res, next) => {
  try {
    const { address } = req.params;

    const project = await Project.findByPk(address);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const updates = await ProjectUpdate.findAll({
      where: { projectAddress: address },
      order: [['timestamp', 'DESC']],
    });

    res.json({
      success: true,
      count: updates.length,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};

// Get projects by creator
exports.getProjectsByCreator = async (req, res, next) => {
  try {
    const { creator } = req.params;

    const projects = await Project.findAll({
      where: { creator },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// Get contributions by contributor
exports.getContributionsByContributor = async (req, res, next) => {
  try {
    const { contributor } = req.params;

    const contributions = await Contribution.findAll({
      where: { contributor },
      order: [['timestamp', 'DESC']],
      include: [{
        model: Project,
        as: 'project',
      }],
    });

    res.json({
      success: true,
      count: contributions.length,
      data: contributions,
    });
  } catch (error) {
    next(error);
  }
};

// Sync project from blockchain
exports.syncProject = async (req, res, next) => {
  try {
    const { address } = req.params;

    const result = await blockchainService.syncProject(address);

    res.json({
      success: true,
      message: 'Project synced successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Sync all projects from blockchain
exports.syncAllProjects = async (req, res, next) => {
  try {
    const result = await blockchainService.syncAllProjects();

    res.json({
      success: true,
      message: 'All projects synced successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get project statistics
exports.getProjectStats = async (req, res, next) => {
  try {
    const { address } = req.params;

    const project = await Project.findByPk(address);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const contributions = await Contribution.findAll({
      where: { projectAddress: address },
    });

    const totalContributors = new Set(contributions.map(c => c.contributor.toLowerCase())).size;
    const averageContribution = contributions.reduce((sum, c) => {
      return sum + BigInt(c.amount);
    }, BigInt(0)) / BigInt(contributions.length || 1);

    const goal = BigInt(project.goalAmount);
    const hundredths = goal > 0n ? BigInt(project.totalRaised) * 10000n / goal : 0n;
    const progress = `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, '0')}`;

    res.json({
      success: true,
      data: {
        totalRaised: project.totalRaised,
        goalAmount: project.goalAmount,
        progress,
        totalContributors,
        averageContribution: averageContribution.toString(),
        contributionCount: contributions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProjectTransactions = async (req, res, next) => {
  try {
    if (!await Project.findByPk(req.params.address)) throw new AppError('Project not found', 404);
    const transactions = await Transaction.findAll({
      where: { projectAddress: req.params.address },
      order: [['blockNumber', 'DESC'], ['logIndex', 'DESC']],
    });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) { next(error); }
};
