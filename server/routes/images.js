const router = require('express').Router();
const { getImage } = require('../controllers/imageController');

router.get('/:id', getImage);

module.exports = router;
