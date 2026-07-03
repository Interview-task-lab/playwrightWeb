/**
 * TestCase Controller
 * Handles CRUD endpoints for test cases:
 *   POST   /api/test-cases
 *   GET    /api/test-cases
 *   DELETE /api/test-cases/:id
 */

const testCaseService = require('../services/testCase.service');
const domainRepository = require('../repositories/domain.repository');

async function createTestCase(req, res, next) {
  try {
    let domainId = req.body.domainId ? parseInt(req.body.domainId, 10) : null;

    // Validate that team members can only save to their domain or sub-domains
    if (req.user.role !== 'admin' && req.user.role !== 'qa') {
      if (!domainId) {
        domainId = req.user.domainId;
      } else {
        const isAllowed = await domainRepository.isDescendantOrSelf(req.user.domainId, domainId);
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You cannot save test cases outside your domain hierarchy.',
          });
        }
      }
    }

    const testCase = await testCaseService.create({
      ...req.body,
      platform: req.body.platform || 'web',
      createdBy: req.user.userId,
      domainId: domainId,
    });
    return res.status(201).json({ success: true, testCase });
  } catch (err) {
    return next(err);
  }
}

async function getAllTestCases(req, res, next) {
  try {
    const domainId = req.query.domainId ? parseInt(req.query.domainId, 10) : null;
    const testCases = await testCaseService.getAll(req.user, domainId);
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
