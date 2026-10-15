const multer = require('multer');

// Keep files in memory, then the controller saves them to MongoDB
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 4 }, // 10 MB each (they are resized afterwards), max 4 images
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPG, PNG, WEBP or GIF images are allowed');
    err.status = 400;
    cb(err);
  },
});
