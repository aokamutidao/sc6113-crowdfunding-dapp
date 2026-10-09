const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { addressParam, projectQuery } = require('../middleware/validation');

// Project routes
router.get('/projects', projectQuery, projectController.getAllProjects);
router.get('/projects/:address', addressParam('address'), projectController.getProjectByAddress);
router.get('/projects/:address/contributions', addressParam('address'), projectController.getProjectContributions);
router.get('/projects/:address/updates', addressParam('address'), projectController.getProjectUpdates);
router.get('/projects/:address/transactions', addressParam('address'), projectController.getProjectTransactions);
router.get('/projects/:address/stats', addressParam('address'), projectController.getProjectStats);
router.post('/projects/:address/sync', addressParam('address'), projectController.syncProject);

// Creator routes
router.get('/creators/:creator/projects', addressParam('creator'), projectController.getProjectsByCreator);

// Contributor routes
router.get('/contributors/:contributor/contributions', addressParam('contributor'), projectController.getContributionsByContributor);

// Sync routes
router.post('/sync/all', projectController.syncAllProjects);

module.exports = router;
