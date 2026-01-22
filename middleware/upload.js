// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configurar multer para memoria (no guardar en disco, se subirá a Cloudinary)
const storage = multer.memoryStorage();

// Filtro de archivos: solo imágenes
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Configurar multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: fileFilter
});

module.exports = upload;
