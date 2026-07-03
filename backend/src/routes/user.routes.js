const { Router } = require('express');
const { createUser, getAllUsers } = require('../controllers/user.controller');

const router = Router();

// Note: Middleware protection will be applied in app.js or route-level in Faz 3
router.post('/', createUser);
router.get('/', getAllUsers);

module.exports = router;
