const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, updateProfile } = require('../controllers/userController');

router.get('/', auth('admin'), list);
router.put('/:id', auth('admin'), updateProfile);

module.exports = router;
