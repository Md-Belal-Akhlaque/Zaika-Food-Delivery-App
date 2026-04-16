import dotenv from "dotenv";
dotenv.config();
import User from "../models/userModel.js";
import mongoose from "mongoose";
import axios from "axios";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utility/cloudinary.js";

// ─────────────────────────────────────────────
// GET CURRENT USER
// FIX: exclude sensitive fields from response
// Original returned full document including password,
// resetOtp, otpBlockedUntil etc — never send these to frontend
// ─────────────────────────────────────────────
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID not found" });
    }

    // FIX: explicitly exclude sensitive fields
    const user = await User.findById(userId).select(
      "-password -resetOtp -otpExpires -otpAttempts -otpBlockedUntil -isOtpVerified"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // FIX: check isActive — deactivated user shouldn't get their data
    if (!user.isActive) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ message: `Get current user error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────
// UPDATE PROFILE (fullName, mobile, profileImage)
// UTILIZES: profileImage, profileImagePublicId, fullName, mobile
// ─────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { fullName, mobile } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle Image Upload
    if (req.file) {
      // Delete old image if exists
      if (user.profileImagePublicId) {
        await deleteFromCloudinary(user.profileImagePublicId);
      }

      const upload = await uploadOnCloudinary(req.file.path);
      user.profileImage = upload.secure_url;
      user.profileImagePublicId = upload.public_id;
    }

    if (fullName) user.fullName = fullName;
    if (mobile) {
      const existing = await User.findOne({ mobile, _id: { $ne: userId } });
      if (existing) return res.status(400).json({ message: "Mobile number already in use" });
      user.mobile = mobile;
    }

    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: `Update profile error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────
// GET CITY FROM COORDINATES (reverse geocode)
// ─────────────────────────────────────────────
export const getCity = async (req, res) => {
  const { latitude, longitude } = req.query;
  const apiKey = process.env.GEOAPIKEY;

  try {
    const result = await axios.get(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${apiKey}`
    );

    const city = result.data.features[0]?.properties?.city || "Unknown";

    return res.status(200).json({ city });
  } catch (err) {
    return res.status(500).json({ error: "Geo API failed" });
  }
};

// ─────────────────────────────────────────────
// SAVE ADDRESS
// FIX: removed addr._id.toString() — address schema has _id:false
//      so _id doesn't exist on embedded address documents
//      match only by address.id (the string id we set manually)
// ─────────────────────────────────────────────
export const saveAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const { address } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID not found" });
    
    if (!address) return res.status(400).json({ message: "Address data is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.addresses) user.addresses = [];

    // Validate required fields
    if (!address.label || !address.address || !address.pincode) {
      return res.status(400).json({ 
        message: "Label, address, and pincode are required" 
      });
    }

    // Validate location coordinates if provided
    if (address.location) {
      const { lat, lon } = address.location;
      if ((lat !== null && lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) ||
          (lon !== null && lon !== undefined && (isNaN(lon) || lon < -180 || lon > 180))) {
        return res.status(400).json({ 
          message: "Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180" 
        });
      }
    }

    // Ensure address has an ID
    if (!address.id) {
      address.id = new mongoose.Types.ObjectId().toString();
    }

    // Check if address with same ID exists (for update)
    const existingIndex = user.addresses.findIndex((a) => a.id === address.id);

    if (existingIndex !== -1) {
      // Update existing address - merge with existing data
      user.addresses[existingIndex] = {
        ...user.addresses[existingIndex],
        ...address
      };
    } else {
      // New address
      user.addresses.push(address);
    }

    await user.save();

    return res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error("SAVE_ADDRESS_ERR:", error);
    return res.status(500).json({ 
      message: "Error saving address", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ─────────────────────────────────────────────
// GET ADDRESSES
// ─────────────────────────────────────────────
export const getAddresses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ message: "User ID not found" });

    const user = await User.findById(userId).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure addresses array exists
    const addresses = user.addresses || [];

    return res.status(200).json({ 
      success: true, 
      addresses 
    });
  } catch (error) {
    console.error("GET_ADDRESSES_ERR:", error);
    return res.status(500).json({ 
      message: "Error fetching addresses", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ─────────────────────────────────────────────
// DELETE ADDRESS
// FIX: removed addr._id.toString() — _id:false on addressSchema
// ─────────────────────────────────────────────
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(400).json({ message: "User ID not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // FIX: only filter by addr.id — _id doesn't exist (schema has _id:false)
    user.addresses = user.addresses.filter((addr) => addr.id !== id);
    await user.save();

    return res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error("DELETE_ADDRESS_ERR:", error);
    return res.status(500).json({ message: "Error deleting address", error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE LOCATION (general user location)
// Note: for delivery partners, use delivery.controller.js → updateLocation
// This is for customer location (used in address/city detection)
// ─────────────────────────────────────────────
export const updateLocation = async (req, res) => {
  try {
    const userId = req.userId;
    const { lat, lon } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID not found" });

    if (!lat || !lon) {
      return res.status(400).json({ message: "lat and lon are required" });
    }

    await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type:        "Point",
          coordinates: [Number(lon), Number(lat)] // GeoJSON: [longitude, latitude]
        }
      },
      { new: true }
    );

    return res.status(200).json({ success: true, message: "Location updated" });
  } catch (error) {
    console.error("UPDATE_LOCATION_ERR:", error);
    return res.status(500).json({ message: "Error updating location", error: error.message });
  }
};

