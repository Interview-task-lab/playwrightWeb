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

const runConfigRepository = require('../repositories/runConfiguration.repository');

/**
 * Enforces domain-level access control for run configurations.
 * - Admin and QA can access all configurations.
 * - Team members (kredi_takimi, hesap_takimi) can ONLY read/write/run/delete configs
 *   within their own domain or sub-domains.
 * @param {'read'|'write'|'run'|'delete'} action
 * @returns {import('express').RequestHandler}
 */
function authorizeRunConfigAccess(action) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { role, domainId } = req.user;

    // Admin and QA have full bypass
    if (role === 'admin' || role === 'qa') {
      return next();
    }

    const configId = req.params.id;

    // If we have an existing config ID (run, delete, getById)
    if (configId) {
      try {
        const config = await runConfigRepository.findById(parseInt(configId, 10));
        if (!config) {
          return res.status(404).json({ success: false, message: 'Run configuration not found.' });
        }

        // Verify config's domain: ALL target domains must be descendants or self of user's domain
        let isAllowed = true;
        for (const configDomainId of config.domain_ids) {
          const match = await domainRepository.isDescendantOrSelf(domainId, configDomainId);
          if (!match) {
            isAllowed = false;
            break;
          }
        }

        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: You do not have permission to ${action} configurations outside your domain scope.`,
          });
        }
      } catch (err) {
        return next(err);
      }
    }

    // For write (POST creation), verify target domainId and testCaseIds
    if (action === 'write' && req.method === 'POST') {
      try {
        const targetDomainIds = req.body.domainIds;
        if (!targetDomainIds || !Array.isArray(targetDomainIds) || targetDomainIds.length === 0) {
          return res.status(400).json({ success: false, message: 'Target domains are required.' });
        }

        // All target domains must be descendant or self of user's domain
        for (const targetDomainId of targetDomainIds) {
          const isDomainAllowed = await domainRepository.isDescendantOrSelf(domainId, targetDomainId);
          if (!isDomainAllowed) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: Cannot create configurations for domains outside your scope.',
            });
          }
        }

        // If custom type, verify all selected testCaseIds
        if (req.body.type === 'custom' && req.body.testCaseIds) {
          for (const tcId of req.body.testCaseIds) {
            const testCase = await tcRepository.findById(tcId);
            if (!testCase) {
              return res.status(404).json({ success: false, message: `Test case with ID ${tcId} not found.` });
            }

            const isTcAllowed = await domainRepository.isDescendantOrSelf(domainId, testCase.domain_id);
            if (!isTcAllowed) {
              return res.status(403).json({
                success: false,
                message: `Forbidden: Test case "${testCase.name}" belongs to a domain outside your scope.`,
              });
            }
          }
        }
      } catch (err) {
        return next(err);
      }
    }

    return next();
  };
}

module.exports = { authorizeRoles, authorizeTestCaseAccess, authorizeRunConfigAccess };

