/**
 * TestCase Controller
 * Handles CRUD endpoints for test cases:
 *   POST   /api/test-cases
 *   GET    /api/test-cases
 *   DELETE /api/test-cases/:id
 */

const testCaseService = require('../services/testCase.service');

async function createTestCase(req, res, next) {
  try {
    const testCase = await testCaseService.create(req.body);
    return res.status(201).json({ success: true, testCase });
  } catch (err) {
    return next(err);
  }
}

async function getAllTestCases(req, res, next) {
  try {
    const testCases = await testCaseService.getAll();
    return res.json({ success: true, testCases });
  } catch (err) {
    return next(err);
  }
}

async function deleteTestCase(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await testCaseService.delete(id);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createTestCase, getAllTestCases, deleteTestCase };
