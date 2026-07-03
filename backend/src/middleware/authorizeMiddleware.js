/**
 * Authorize Middleware
 *
 * Enforces role-based and domain-based access controls.
 */

const testCaseRepository = require('../repositories/user.repository'); // wait, let's import testCaseRepository!
const tcRepository = require('../repositories/testCase.repository');
const domainRepository = require('../repositories/domain.repository');

/**
 * Enforces that the authenticated user has one of the allowed roles.
 * @param {...string} allowedRoles
 * @returns {import('express').RequestHandler}
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized.`,
      });
    }

    return next();
  };
}

/**
 * Enforces domain-level access control for test case operations.
 * - Admin and QA can access all domains.
 * - Team members (kredi_takimi, hesap_takimi) can read all test cases (read-only).
 * - Team members can ONLY run or delete test cases belonging to their own domain or sub-domains.
 * @param {'read'|'write'|'run'|'delete'} action
 * @returns {import('express').RequestHandler}
 */
function authorizeTestCaseAccess(action) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { role, domainId } = req.user;

    // Admin and QA have full bypass
    if (role === 'admin' || role === 'qa') {
      return next();
    }

    // Read action is allowed for all domains (read-only access)
    if (action === 'read') {
      return next();
    }

    // For write/delete/run, check the target test case's domain
    const testCaseId = req.params.id;

    if (testCaseId) {
      try {
        const testCase = await tcRepository.findById(parseInt(testCaseId, 10));
        if (!testCase) {
          return res.status(404).json({ success: false, message: 'Test case not found.' });
        }

        // Check if child domain is descendant of user's parent domain
        const isAllowed = await domainRepository.isDescendantOrSelf(domainId, testCase.domain_id);
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: You do not have permission to ${action} tests outside your domain.`,
          });
        }
      } catch (err) {
        return next(err);
      }
    }

    return next();
  };
}

module.exports = { authorizeRoles, authorizeTestCaseAccess };
