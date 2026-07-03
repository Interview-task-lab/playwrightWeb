const { Router } = require('express');
const { createTestCase, getAllTestCases, deleteTestCase } = require('../controllers/testCase.controller');
const { authorizeTestCaseAccess } = require('../middleware/authorizeMiddleware');

const router = Router();

router.post('/', authorizeTestCaseAccess('write'), createTestCase);
router.get('/', authorizeTestCaseAccess('read'), getAllTestCases);
router.delete('/:id', authorizeTestCaseAccess('delete'), deleteTestCase);

module.exports = router;
