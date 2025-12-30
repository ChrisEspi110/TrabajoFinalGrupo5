const bookService = require('../services/bookService');

class BookController {
  async searchBooks(req, res) {
    try {
      const { query } = req.query;
      console.log('Búsqueda de libros - Query:', query);
      
      if (!query || query.trim() === '') {
        console.log('Obteniendo todos los libros...');
        const books = await bookService.getAllBooks();
        console.log(`Libros encontrados: ${books.length}`);
        return res.json({ success: true, data: books });
      }

      console.log('Buscando libros con término:', query.trim());
      const books = await bookService.searchBooks(query.trim());
      console.log(`Libros encontrados: ${books.length}`);
      res.json({ success: true, data: books });
    } catch (error) {
      console.error('Error en searchBooks:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al buscar libros' 
      });
    }
  }

  async getBookById(req, res) {
    try {
      const { id } = req.params;
      const book = await bookService.getBookById(id);
      
      if (!book) {
        return res.status(404).json({ 
          success: false, 
          message: 'Libro no encontrado' 
        });
      }

      res.json({ success: true, data: book });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al obtener el libro' 
      });
    }
  }
}

module.exports = new BookController();

