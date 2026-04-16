import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// FIX: config must be called ONCE at app startup — not inside every upload call
// Moving it inside the function meant cloudinary was re-configured on every
// single upload request — unnecessary overhead
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.CLOUD_APIKEY,
  api_secret: process.env.CLOUD_SECRET,
});

export const uploadOnCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });

    // Delete temp file after successful upload
    fs.unlinkSync(filePath);

    return result; // full result — caller uses result.secure_url and result.public_id
  } catch (error) {
    // Always clean up temp file even if upload fails
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Cloudinary upload error:", error.message);
    return null;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw error;
  }
};
