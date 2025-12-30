const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/search', bookController.searchBooks.bind(bookController));
router.get('/:id', bookController.getBookById.bind(bookController));

module.exports = router;




