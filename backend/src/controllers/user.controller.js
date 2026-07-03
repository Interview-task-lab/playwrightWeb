/**
 * User Controller
 *
 * Handles HTTP requests for user management.
 */

const userService = require('../services/user.service');

async function createUser(req, res, next) {
  try {
    const { firstName, lastName, role, domainId } = req.body;
    const user = await userService.create({ firstName, lastName, role, domainId });
    return res.status(201).json({ success: true, user });
  } catch (err) {
    return next(err);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const users = await userService.getAll();
    return res.json({ success: true, users });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createUser, getAllUsers };
