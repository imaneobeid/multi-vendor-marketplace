// Resizes uploaded photos so big gallery pictures (often 3-8 MB) become small, fast files.
let sharp = null;
try {
  sharp = require('sharp');
} catch {
  console.warn('The "sharp" package is missing, so photos are stored as uploaded. Run "npm install" in the server folder.');
}

const MAX_WITHOUT_RESIZING = 2 * 1024 * 1024;

exports.processImage = async (buffer, contentType) => {
  if (!sharp) {
    if (buffer.length > MAX_WITHOUT_RESIZING) {
      const err = new Error('This photo is too large. Run "npm install" in the server folder, or use a photo under 2 MB.');
      err.status = 400;
      throw err;
    }
    return { data: buffer, contentType };
  }
  try {
    const data = await sharp(buffer)
      .rotate() // turns phone photos the right way up
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { data, contentType: 'image/jpeg' };
  } catch {
    const err = new Error('That file could not be read as an image');
    err.status = 400;
    throw err;
  }
};
