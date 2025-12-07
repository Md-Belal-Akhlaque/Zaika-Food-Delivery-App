import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

//using doucmentation of cloudinary we will upload image to cloudinary
const uploadOnCloudinary = async (filePath) => {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_APIKEY,
    api_secret: process.env.CLOUD_SECRET,
  });

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });

    fs.unlinkSync(filePath);

    // return {
    //   url: result.secure_url,
    //   public_id: result.public_id,
    // };
    return result; // return full result object not just url string
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return null;
  }
};


const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Deletion Result:", result);
    return result;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw error;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
