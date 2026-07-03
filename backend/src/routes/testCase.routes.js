const { Router } = require('express');
const { createTestCase, getAllTestCases, deleteTestCase } = require('../controllers/testCase.controller');

const router = Router();

router.post('/', createTestCase);
router.get('/', getAllTestCases);
router.delete('/:id', deleteTestCase);

module.exports = router;
