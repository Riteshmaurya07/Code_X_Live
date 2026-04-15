const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: (process.env.CLOUD_NAME || "").replace(";", "").trim(),
  api_key: (process.env.CLOUDINARY_APIKEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_SECRETKEY || "").trim(),
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "codexlive/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { cloudinary, uploadAvatar };
