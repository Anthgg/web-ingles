const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { consultar, historial } = require('../controllers/dniController');

router.post('/', auth(), consultar);
router.get('/historial', auth(), historial);

module.exports = router;
