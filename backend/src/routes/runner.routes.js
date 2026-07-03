const { Router } = require('express');
const { runTestCase, getRunStatus } = require('../controllers/runner.controller');

const router = Router();

// IMPORTANT: run-status route must be defined BEFORE /:id/run
// to prevent Express matching 'run-status' as an :id param
router.get('/run-status', getRunStatus);
router.post('/:id/run', runTestCase);

module.exports = router;
