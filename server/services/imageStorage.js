// Where product photos are kept.
//
//   Default      : MongoDB (works anywhere, needs no extra account)
//   With keys    : Cloudinary, switched on by setting CLOUDINARY_URL
//                  (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)
//
// The rest of the app only deals with image URLs, so it does not care which one is used.
const Image = require('../models/Image');

const useCloudinary = !!(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

let cloudinary = null;
function getCloudinary() {
  if (!cloudinary) {
    cloudinary = require('cloudinary').v2;
    if (!process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }
  return cloudinary;
}

exports.provider = useCloudinary ? 'cloudinary' : 'mongodb';

// "https://res.cloudinary.com/demo/image/upload/v123/souk/abc.jpg" -> "souk/abc"
exports.cloudinaryPublicId = (url) => {
  const m = String(url).match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  return m ? m[1] : null;
};

// Stores one photo and returns the URL to keep on the product
exports.saveImage = async ({ data, contentType, owner }) => {
  if (useCloudinary) {
    const result = await new Promise((resolve, reject) => {
      getCloudinary()
        .uploader.upload_stream({ folder: 'souk', resource_type: 'image' }, (err, res) => (err ? reject(err) : resolve(res)))
        .end(data);
    });
    return result.secure_url;
  }
  const img = await Image.create({ data, contentType, size: data.length, owner });
  return `/api/images/${img._id}`;
};

// Removes photos by URL. Never throws: a leftover file is better than a failed request.
exports.deleteImages = async (urls = []) => {
  const mongoIds = [];
  for (const url of urls) {
    if (String(url).startsWith('/api/images/')) {
      mongoIds.push(String(url).split('/').pop());
    } else if (useCloudinary) {
      const publicId = exports.cloudinaryPublicId(url);
      if (publicId) await getCloudinary().uploader.destroy(publicId).catch(() => {});
    }
  }
  const valid = mongoIds.filter((id) => /^[0-9a-f]{24}$/i.test(id));
  if (valid.length) await Image.deleteMany({ _id: { $in: valid } });
};
