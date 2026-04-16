import Shop from "../models/shopModel.js";
import Item from "../models/itemModel.js";
import Order from "../models/orderModel.js";
import ShopOrder from "../models/shopOrderModel.js";
import mongoose from "mongoose";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utility/cloudinary.js";
import { getShopEarningsForPeriod } from "../services/wallet.service.js";


// ========================= CREATE SHOP =========================
export const createShop = async (req, res) => {
  try {
    const ownerId = req.userId;
    const { name, address, city, state, latitude, longitude } = req.body;
    
    if (!name || !address || !city || !state) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //  Validate coordinates
    if (latitude && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ message: "Invalid latitude" });
    }

    if (longitude && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ message: "Invalid longitude" });
    }

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      const upload = await uploadOnCloudinary(req.file.path);
      if (!upload) {
        return res.status(500).json({ message: "Image upload failed" });
      }
      imageUrl = upload.secure_url;
      imagePublicId = upload.public_id;
    }

    let shop;

    try {
      shop = await Shop.create({
        name,
        address,
        city,
        state,
        latitude,
        longitude,
        image: imageUrl,
        imagePublicId,
        owner: ownerId,  // FIXED: Field name is "owner" not "ownerId"
        location: latitude && longitude ? {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)]
        } : undefined
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "Shop already exists" });
      }
      throw err;
    }

    return res.status(201).json({
      success: true,
      message: "Shop created",
      shop
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= GET ALL SHOPS =========================
export const getShops = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;

    const shops = await Shop.find({ isActive: true })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.json({ success: true, shops });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= GET SHOP BY ID =========================
export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await Shop.findOne({ _id: id, isActive: true });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // FIX: items array nahi hai shop mein — alag query karo
    const items = await Item.find({
      shop: shop._id,
      isActive: true,
      isAvailable: true
    }).sort({ createdAt: -1 });

    return res.json({ success: true, shop: { ...shop.toObject(), items } });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= UPDATE SHOP =========================
export const updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    const shop = await Shop.findById(id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { name, address, city, latitude, longitude } = req.body;

    // Validate coordinates
    if (latitude && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ message: "Invalid latitude" });
    }

    if (longitude && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ message: "Invalid longitude" });
    }

    if (name) shop.name = name;
    if (address) shop.address = address;
    if (city) shop.city = city;

    if (latitude && longitude) {
      shop.location = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)]
      };
    }

    if (req.file) {
      if (shop.imagePublicId) {
        await deleteFromCloudinary(shop.imagePublicId);
      }

      const upload = await uploadOnCloudinary(req.file.path);
      shop.image = upload.secure_url;
      shop.imagePublicId = upload.public_id;
    }

    await shop.save();

    return res.json({
      success: true,
      message: "Shop updated",
      shop
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= DELETE SHOP =========================
export const deleteShop = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    const shop = await Shop.findById(id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // ✅ Prevent delete if active orders exist
    const activeOrders = await ShopOrder.find({
      shop: shop._id,
      status: { $in: ["Pending", "Accepted", "Preparing"] }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        message: "Cannot delete shop with active orders"
      });
    }

    shop.isActive = false;
    await shop.save();

    await Item.updateMany(
      { shop: shop._id },
      { isActive: false }
    );

    return res.json({
      success: true,
      message: "Shop deleted"
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= TOGGLE OPEN =========================
export const toggleOpen = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    shop.isOpen = !shop.isOpen;
    await shop.save();

    return res.json({
      success: true,
      isOpen: shop.isOpen
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= TOGGLE DELIVERY =========================
export const toggleDelivery = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    shop.isDeliveryAvailable = !shop.isDeliveryAvailable;
    await shop.save();

    return res.json({
      success: true,
      isDeliveryAvailable: shop.isDeliveryAvailable
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ========================= GET MY SHOP =========================
export const getMyShop = async (req, res) => {
  try {
    const ownerId = req.userId;

    if (!ownerId) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated - userId missing" 
      });
    }

    const shop = await Shop.findOne({ owner: ownerId, isActive: true });

    if (!shop) {
      return res.status(200).json({
        success: true,
        hasShop: false,
        message: "No shop created yet",
      });
    }

    const items = await Item.find({
      shop: shop._id,
      isActive: true
    }).sort({ createdAt: -1 });

    return res.json({ success: true, shop: { ...shop.toObject(), items } });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// ========================= GET SHOPS BY CITY =========================
// UTILIZES: shopType, rating, isOpen, isDeliveryAvailable
export const getShopsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const { type, rating, openOnly } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, message: "City required" });
    }

    const query = {
      city: { $regex: new RegExp(city, "i") },
      isActive: true
    };

    // Filter by Shop Type (Cuisine)
    if (type) {
      query.shopType = { $in: type.split(",") };
    }

    // Filter by Rating
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    // Filter by Status
    if (openOnly === "true") {
      query.isOpen = true;
    }

    let shops = await Shop.find(query).sort({ rating: -1, createdAt: -1 });

    // PERSONALIZATION LOGIC
    // UTILIZES: User history, Popularity
    if (req.userId) {
      // 1. Get user's ordered shop IDs
      const userOrders = await ShopOrder.find({ 
        order: { $in: await Order.find({ user: req.userId }).distinct("_id") } 
      }).distinct("shop");

      const userOrderedShopIds = userOrders.map(id => id.toString());

      // 2. Sort shops: User's previously ordered shops first
      shops.sort((a, b) => {
        const aOrdered = userOrderedShopIds.includes(a._id.toString());
        const bOrdered = userOrderedShopIds.includes(b._id.toString());
        
        if (aOrdered && !bOrdered) return -1;
        if (!aOrdered && bOrdered) return 1;
        return 0; // maintain rating sort if both or neither ordered
      });
    }

    return res.json({ success: true, shops });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ========================= EDIT SHOP =========================
export const editShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const ownerId = req.userId;

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    if (shop.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updates = { ...req.body };

    if (updates.latitude || updates.longitude) {
      const lat = Number(updates.latitude || 0);
      const lng = Number(updates.longitude || 0);
      if (lat && lng) {
        updates.location = { type: "Point", coordinates: [lng, lat] };
      }
      delete updates.latitude;
      delete updates.longitude;
    }

    if (req.file) {
      if (shop.imagePublicId) {
        try {
          await deleteFromCloudinary(shop.imagePublicId);
        } catch (e) {
}
      }
      const result = await uploadOnCloudinary(req.file.path);
      updates.image = result.secure_url;
      updates.imagePublicId = result.public_id;
    }

    const updated = await Shop.findByIdAndUpdate(shopId, updates, { new: true });

    return res.json({ success: true, shop: updated });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getShopEarningsToday = async (req, res) => {
  try {
    const ownerId = req.userId;
    const summary = await getShopEarningsForPeriod({ ownerId, period: "today" });
    const accrued = await getAccruedShopEarningsForPeriod({ ownerId, period: "today" });
    const transactions = [...(summary.transactions || []), ...(accrued.transactions || [])]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return res.status(200).json({
      success: true,
      ...summary,
      total: Number(summary.total || 0) + Number(accrued.total || 0),
      transactions
    });
  } catch (error) {
    console.error("GET_SHOP_EARNINGS_TODAY_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getShopEarningsMonth = async (req, res) => {
  try {
    const ownerId = req.userId;
    const summary = await getShopEarningsForPeriod({ ownerId, period: "month" });
    const accrued = await getAccruedShopEarningsForPeriod({ ownerId, period: "month" });
    const transactions = [...(summary.transactions || []), ...(accrued.transactions || [])]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return res.status(200).json({
      success: true,
      ...summary,
      total: Number(summary.total || 0) + Number(accrued.total || 0),
      transactions
    });
  } catch (error) {
    console.error("GET_SHOP_EARNINGS_MONTH_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAccruedShopEarningsForPeriod = async ({ ownerId, period = "today" }) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  // These are paid orders that are not yet settled into wallet (e.g. delivered pending settlement cycle).
  const rows = await ShopOrder.find({
    owner: ownerId,
    isEarningsProcessed: false,
    status: { $ne: "Cancelled" },
    createdAt: { $gte: start, $lte: end }
  })
    .populate("order", "paymentStatus paymentMethod paymentCapturedAt")
    .select("order shopEarning shopAmount subtotal commission createdAt")
    .lean();

  const eligible = rows.filter((row) => row?.order?.paymentStatus === "Paid");
  const transactions = eligible.map((row) => {
    const amount = Number(
      row.shopEarning ?? row.shopAmount ?? Math.max(0, Number(row.subtotal || 0) - Number(row.commission || 0))
    );
    return {
      shopOrderId: row._id,
      orderId: row.order?._id,
      uniqueTransactionId: `accrued:${row._id}`,
      date: row.order?.paymentCapturedAt || row.createdAt,
      type: "credit",
      amount,
      signedAmount: amount,
      source: "accrued"
    };
  });

  return {
    total: transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    transactions
  };
};

