import dotenv from "dotenv";
dotenv.config();
// Yaha par User model import kar rahe hai jisse hum database (MongoDB) me user ko find kar sake
import User from "../models/userModel.js";
import axios from "axios";

// Ye controller function current logged-in user ka data return karta hai
export const getCurrentUser = async (req, res) => {
  try {
    // Middleware ne JWT token verify karke req me userId set kiya tha
    const userId = req.userId;

    // Agar userId nahi mili → token invalid ya user logged-in nahi
    if (!userId) {
      return res.status(400).json({ message: "user id not found" });
    }

    // MongoDB se userId ke basis pe user ka data find kar rahe hai
    const user = await User.findById(userId);

    // Agar user DB me exist nahi karta → deleted, invalid id, etc
    if (!user) {
      return res.status(400).json({ message: "user is not found" });
    }

    // Agar sab sahi hai to final response me full user object bhej do
    //this will send the data to front end

    return res.status(200).json(user);
  } catch (error) {
    // Try block me koi bhi unexpected error aaye to yaha aayega
    return res.status(500).json({ message: `get current error ${error}` });
  }
};

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

export const saveAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const { address } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.addresses) user.addresses = [];

    // Check if address with same ID exists (for update)
    const existingIndex = user.addresses.findIndex((a) => a.id === address.id || a._id.toString() === address.id);

    if (existingIndex !== -1) {
      user.addresses[existingIndex] = address;
    } else {
      // Ensure ID
      if (!address.id) address.id = new Date().getTime().toString();
      user.addresses.push(address);
    }

    await user.save();

    return res.status(200).json(user.addresses);
  } catch (error) {
    console.error("Save Address Error:", error);
    return res.status(500).json({ message: "Error saving address", error });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ message: "User ID not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    return res.status(200).json(user.addresses || []);
  } catch (error) {
    console.error("Get Addresses Error:", error);
    return res.status(500).json({ message: "Error fetching addresses", error });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) return res.status(400).json({ message: "User ID not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    user.addresses = user.addresses.filter((addr) => {
      return addr.id !== id && addr._id.toString() !== id;
    });
    await user.save();

    return res.status(200).json(user.addresses);
  } catch (error) {
    console.error("Delete Address Error:", error);
    return res.status(500).json({ message: "Error deleting address", error });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const userId = req.userId;
    const { lat, lon } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID not found" });

    await User.findByIdAndUpdate(userId, {
      location: {
        type: "Point",
        coordinates: [lon, lat] // MongoDB expects [longitude, latitude]
      }
    },{new:true});

    return res.status(200).json({ success: true, message: "Location updated" });
  } catch (error) {
    console.error("Update Location Error:", error);
    return res.status(500).json({ message: "Error updating location", error });
  }
};
