const { pool } = require('../config/database');
const bookService = require('./bookService');

class LoanService {
  // Calcular fecha de devolución (regla: si cae sábado o domingo, pasa al lunes)
  calculateReturnDate(loanDate, daysRequested) {
    // Crear fecha desde string YYYY-MM-DD (sin hora)
    const date = new Date(loanDate + 'T00:00:00');
    
    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      throw new Error('Fecha de préstamo inválida');
    }
    
    // Sumar los días solicitados
    date.setDate(date.getDate() + daysRequested);
    
    // Si cae en sábado (6) o domingo (0), mover al siguiente lunes
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) { // Sábado
      date.setDate(date.getDate() + 2); // Sumar 2 días para llegar al lunes
    } else if (dayOfWeek === 0) { // Domingo
      date.setDate(date.getDate() + 1); // Sumar 1 día para llegar al lunes
    }
    
    // Formatear como YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // Crear un préstamo
  async createLoan(bookId, daysRequested, readerFirstName, readerLastName) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validar ID del libro
      if (!bookId || isNaN(parseInt(bookId))) {
        throw new Error('El ID del libro es inválido');
      }
      
      const bookIdInt = parseInt(bookId);
      
      // Validar días solicitados
      if (!daysRequested || isNaN(parseInt(daysRequested))) {
        throw new Error('Los días solicitados deben ser un número válido');
      }
      
      const daysInt = parseInt(daysRequested);
      if (daysInt < 1 || daysInt > 15) {
        throw new Error('Los días solicitados deben estar entre 1 y 15');
      }

      // Validar datos del lector
      if (!readerFirstName || readerFirstName.trim() === '') {
        throw new Error('El nombre del lector es requerido');
      }
      if (!readerLastName || readerLastName.trim() === '') {
        throw new Error('El apellido del lector es requerido');
      }

      // Validar que el libro existe y está disponible
      const book = await bookService.getBookById(bookIdInt);
      if (!book) {
        throw new Error('El libro no existe en la base de datos');
      }
      
      // Verificar disponibilidad nuevamente (doble verificación para evitar race conditions)
      const availabilityCheck = await client.query(
        'SELECT available FROM books WHERE id = $1 FOR UPDATE',
        [bookIdInt]
      );
      
      if (availabilityCheck.rows.length === 0) {
        throw new Error('El libro no existe');
      }
      
      if (!availabilityCheck.rows[0].available) {
        throw new Error('El libro no está disponible (ya fue prestado)');
      }

      // Calcular fechas
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const loanDate = `${year}-${month}-${day}`;
      
      const returnDate = this.calculateReturnDate(loanDate, daysInt);

      // Crear el préstamo
      const result = await client.query(
        `INSERT INTO loans (book_id, loan_date, return_date, days_requested, reader_first_name, reader_last_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [bookIdInt, loanDate, returnDate, daysInt, readerFirstName.trim(), readerLastName.trim()]
      );

      // Marcar el libro como no disponible
      await client.query(
        'UPDATE books SET available = false WHERE id = $1',
        [bookIdInt]
      );

      await client.query('COMMIT');
      
      return {
        ...result.rows[0],
        book: book
      };
    } catch (error) {
      await client.query('ROLLBACK');
      // Re-lanzar el error con mensaje claro
      if (error.message.includes('Error al crear préstamo')) {
        throw error;
      }
      throw new Error(`Error al crear préstamo: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Obtener todos los préstamos
  async getAllLoans() {
    try {
      const result = await pool.query(
        `SELECT l.*, b.title, b.author, b.code
         FROM loans l
         JOIN books b ON l.book_id = b.id
         ORDER BY l.loan_date DESC`
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener préstamos: ${error.message}`);
    }
  }

  // Obtener préstamos activos
  async getActiveLoans() {
    try {
      const result = await pool.query(
        `SELECT l.*, b.title, b.author, b.code,
                CASE 
                  WHEN l.return_date < CURRENT_DATE THEN 'Vencido'
                  WHEN l.return_date = CURRENT_DATE THEN 'Vence hoy'
                  ELSE 'Activo'
                END as status
         FROM loans l
         JOIN books b ON l.book_id = b.id
         WHERE l.return_date >= CURRENT_DATE - INTERVAL '1 day'
         ORDER BY l.return_date ASC`
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener préstamos activos: ${error.message}`);
    }
  }

  // Registrar devolución de libro
  async returnBook(loanId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Obtener el préstamo
      const loanResult = await client.query(
        `SELECT l.*, b.id as book_id
         FROM loans l
         JOIN books b ON l.book_id = b.id
         WHERE l.id = $1`,
        [loanId]
      );
      
      if (loanResult.rows.length === 0) {
        throw new Error('Préstamo no encontrado');
      }
      
      const loan = loanResult.rows[0];
      
      // Marcar el libro como disponible
      await client.query(
        'UPDATE books SET available = true WHERE id = $1',
        [loan.book_id]
      );
      
      // Eliminar el préstamo (o podrías agregar un campo returned_date)
      await client.query(
        'DELETE FROM loans WHERE id = $1',
        [loanId]
      );
      
      await client.query('COMMIT');
      
      return { success: true, message: 'Libro devuelto exitosamente' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error al devolver el libro: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Obtener estadísticas
  async getStatistics() {
    try {
      const stats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM books) as total_books,
          (SELECT COUNT(*) FROM books WHERE available = true) as available_books,
          (SELECT COUNT(*) FROM books WHERE available = false) as loaned_books,
          (SELECT COUNT(*) FROM loans WHERE return_date >= CURRENT_DATE) as active_loans,
          (SELECT COUNT(*) FROM loans WHERE return_date < CURRENT_DATE) as overdue_loans
      `);
      
      return stats.rows[0];
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

module.exports = new LoanService();

