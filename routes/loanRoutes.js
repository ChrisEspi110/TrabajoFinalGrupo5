const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

router.post('/', loanController.createLoan.bind(loanController));
router.get('/', loanController.getAllLoans.bind(loanController));
router.get('/active', loanController.getActiveLoans.bind(loanController));
router.post('/return/:id', loanController.returnBook.bind(loanController));
router.get('/statistics', loanController.getStatistics.bind(loanController));

module.exports = router;

