const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, create } = require('../controllers/movementController');

router.get('/', auth(), list);
router.post('/', auth(), create);

module.exports = router;
