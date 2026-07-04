const { Router } = require('express');
const {
  createConfig,
  getConfigs,
  runConfig,
  deleteConfig,
  getTestsForConfig,
} = require('../controllers/runConfiguration.controller');
const { authorizeRunConfigAccess } = require('../middleware/authorizeMiddleware');

const router = Router();

router.get('/', getConfigs);
router.post('/', authorizeRunConfigAccess('write'), createConfig);
router.post('/:id/run', authorizeRunConfigAccess('run'), runConfig);
router.get('/:id/tests', authorizeRunConfigAccess('read'), getTestsForConfig);
router.delete('/:id', authorizeRunConfigAccess('delete'), deleteConfig);

module.exports = router;

