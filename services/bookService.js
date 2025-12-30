const { pool } = require('../config/database');

class BookService {
  // Buscar libros por título, autor o código
  async searchBooks(query) {
    try {
      const searchTerm = `%${query}%`;
      const result = await pool.query(
        `SELECT id, title, author, code, available 
         FROM books 
         WHERE title ILIKE $1 OR author ILIKE $1 OR code ILIKE $1
         ORDER BY title ASC`,
        [searchTerm]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error al buscar libros: ${error.message}`);
    }
  }

  // Obtener todos los libros
  async getAllBooks() {
    try {
      console.log('Ejecutando consulta: SELECT * FROM books');
      const result = await pool.query(
        `SELECT id, title, author, code, available 
         FROM books 
         ORDER BY title ASC`
      );
      console.log(`Consulta exitosa. Filas obtenidas: ${result.rows.length}`);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllBooks:', error);
      throw new Error(`Error al obtener libros: ${error.message}`);
    }
  }

  // Obtener un libro por ID
  async getBookById(id) {
    try {
      const result = await pool.query(
        `SELECT id, title, author, code, available 
         FROM books 
         WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error al obtener el libro: ${error.message}`);
    }
  }

  // Verificar si un libro está disponible
  async isBookAvailable(id) {
    try {
      const book = await this.getBookById(id);
      return book && book.available === true;
    } catch (error) {
      return false;
    }
  }

  // Marcar libro como no disponible
  async markAsUnavailable(id) {
    try {
      await pool.query(
        `UPDATE books SET available = false WHERE id = $1`,
        [id]
      );
    } catch (error) {
      throw new Error(`Error al actualizar disponibilidad: ${error.message}`);
    }
  }

  // Marcar libro como disponible
  async markAsAvailable(id) {
    try {
      await pool.query(
        `UPDATE books SET available = true WHERE id = $1`,
        [id]
      );
    } catch (error) {
      throw new Error(`Error al actualizar disponibilidad: ${error.message}`);
    }
  }
}

module.exports = new BookService();

