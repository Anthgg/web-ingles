const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, create, update, remove, exportCsv } = require('../controllers/productController');

router.get('/', auth(), list);
router.post('/', auth(), create);
router.put('/:id', auth(), update);
router.delete('/:id', auth('admin'), remove);
router.get('/export/csv', auth(), exportCsv);

module.exports = router;
