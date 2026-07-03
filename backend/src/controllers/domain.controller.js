/**
 * Domain Controller
 *
 * Handles HTTP requests for listing domains and sub-domains.
 */

const domainRepository = require('../repositories/domain.repository');

async function getDomains(req, res, next) {
  try {
    const rawDomains = await domainRepository.findAll();

    // Build hierarchical tree
    const domainMap = new Map();
    const roots = [];

    // Initialize all domains in the map
    rawDomains.forEach(d => {
      domainMap.set(d.id, {
        id: d.id,
        name: d.name,
        parentId: d.parent_id,
        subDomains: []
      });
    });

    // Populate subDomains arrays and find roots
    rawDomains.forEach(d => {
      const item = domainMap.get(d.id);
      if (d.parent_id === null) {
        roots.push(item);
      } else {
        const parent = domainMap.get(d.parent_id);
        if (parent) {
          parent.subDomains.push(item);
        } else {
          roots.push(item); // Fallback
        }
      }
    });

    return res.json({ success: true, domains: roots });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDomains };
