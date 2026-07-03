const { Router } = require('express');
const { getConfig } = require('../controllers/config.controller');

const router = Router();

router.get('/', getConfig);

module.exports = router;
