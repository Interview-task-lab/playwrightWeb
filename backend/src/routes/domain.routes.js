const { Router } = require('express');
const { getDomains } = require('../controllers/domain.controller');

const router = Router();

router.get('/', getDomains);

module.exports = router;
