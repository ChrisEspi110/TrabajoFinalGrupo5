const loanService = require('../services/loanService');

class LoanController {
  async createLoan(req, res) {
    try {
      const { bookId, daysRequested, readerFirstName, readerLastName } = req.body;

      // Validaciones exhaustivas
      if (bookId === undefined || bookId === null || bookId === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'El ID del libro es requerido' 
        });
      }

      if (daysRequested === undefined || daysRequested === null || daysRequested === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Los días de préstamo son requeridos' 
        });
      }

      if (!readerFirstName || readerFirstName.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre del lector es requerido' 
        });
      }

      if (!readerLastName || readerLastName.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'El apellido del lector es requerido' 
        });
      }

      // Validar que bookId sea un número válido
      const bookIdNum = parseInt(bookId);
      if (isNaN(bookIdNum) || bookIdNum <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'El ID del libro debe ser un número válido' 
        });
      }

      // Validar que daysRequested sea un número válido
      const days = parseInt(daysRequested);
      if (isNaN(days)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Los días de préstamo deben ser un número' 
        });
      }

      if (days < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Los días de préstamo deben ser al menos 1' 
        });
      }

      if (days > 15) {
        return res.status(400).json({ 
          success: false, 
          message: 'Los días de préstamo no pueden exceder 15 días' 
        });
      }

      const loan = await loanService.createLoan(bookIdNum, days, readerFirstName.trim(), readerLastName.trim());
      
      res.status(201).json({ 
        success: true, 
        message: 'Préstamo registrado exitosamente',
        data: loan 
      });
    } catch (error) {
      // Determinar código de estado apropiado
      let statusCode = 500;
      const errorMessage = error.message || 'Error al crear el préstamo';
      
      if (errorMessage.includes('no existe') || 
          errorMessage.includes('no está disponible') ||
          errorMessage.includes('inválido') ||
          errorMessage.includes('deben estar entre')) {
        statusCode = 400;
      } else if (errorMessage.includes('no autorizado') || 
                 errorMessage.includes('permiso')) {
        statusCode = 403;
      }
      
      console.error('Error en createLoan:', error);
      
      res.status(statusCode).json({ 
        success: false, 
        message: errorMessage
      });
    }
  }

  async getAllLoans(req, res) {
    try {
      const loans = await loanService.getAllLoans();
      res.json({ success: true, data: loans });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al obtener préstamos' 
      });
    }
  }

  async getActiveLoans(req, res) {
    try {
      const loans = await loanService.getActiveLoans();
      res.json({ success: true, data: loans });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al obtener préstamos activos' 
      });
    }
  }

  async returnBook(req, res) {
    try {
      const { id } = req.params;
      const result = await loanService.returnBook(id);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al devolver el libro' 
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const stats = await loanService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al obtener estadísticas' 
      });
    }
  }
}

module.exports = new LoanController();

