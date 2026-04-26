import mongoose from "mongoose";
import Rating from "../models/ratingModel.js";
import Item from "../models/itemModel.js";
import Shop from "../models/shopModel.js";
import Order from "../models/orderModel.js";
import ShopOrder from "../models/shopOrderModel.js";

// ─────────────────────────────────────────────
// ADD OR UPDATE RATING
// ─────────────────────────────────────────────
export const addRating = async (req, res) => {
  try {
    const { itemId, shopId, rating, review } = req.body;
    const userId = req.userId;

    if (!itemId || !shopId || !rating) {
      return res.status(400).json({ message: "itemId, shopId and rating are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId) || !mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ message: "Invalid itemId or shopId" });
    }

    const parsedRating = Number(rating);
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const cleanReview = typeof review === "string" ? review.trim() : "";
    if (cleanReview && cleanReview.length < 3) {
      return res.status(400).json({ message: "Review must be at least 3 characters or left empty" });
    }

    const itemObjectId = new mongoose.Types.ObjectId(itemId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const itemDoc = await Item.findById(itemObjectId).select("_id shop");
    if (!itemDoc) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (String(itemDoc.shop) !== String(shopObjectId)) {
      return res.status(400).json({ message: "Item does not belong to the selected shop" });
    }

    const userOrderIds = await Order.find({ user: userId }).distinct("_id");
    if (!userOrderIds.length) {
      return res.status(403).json({ message: "You can only rate delivered items you have purchased" });
    }

    const boughtShopOrder = await ShopOrder.findOne({
      order: { $in: userOrderIds },
      shop: shopObjectId,
      status: "Delivered",
      "items.item": itemObjectId
    });

    if (!boughtShopOrder) {
      return res.status(403).json({
        message: "You can only rate delivered items you have purchased"
      });
    }

    const existingRating = await Rating.findOne({
      user: userId,
      item: itemObjectId,
      order: boughtShopOrder.order
    });

    if (existingRating) {
      existingRating.rating = parsedRating;
      existingRating.review = cleanReview || null;
      existingRating.shop = shopObjectId;
      await existingRating.save();
    } else {
      await Rating.create({
        user: userId,
        item: itemObjectId,
        shop: shopObjectId,
        order: boughtShopOrder.order,
        rating: parsedRating,
        review: cleanReview || null
      });
    }

    const itemStats = await Rating.aggregate([
      { $match: { item: itemObjectId } },
      {
        $group: {
          _id:           "$item",
          averageRating: { $avg: "$rating" },
          ratingCount:   { $sum: 1 }
        }
      }
    ]);

    const itemAvg   = itemStats.length > 0
      ? Number(itemStats[0].averageRating.toFixed(2))
      : 0;
    const itemCount = itemStats.length > 0 ? itemStats[0].ratingCount : 0;

    await Item.findByIdAndUpdate(itemObjectId, {
      rating:      itemAvg,
      ratingCount: itemCount
    });

    const shopStats = await Rating.aggregate([
      { $match: { shop: shopObjectId } },
      {
        $group: {
          _id:           "$shop",
          averageRating: { $avg: "$rating" },
          ratingCount:   { $sum: 1 }
        }
      }
    ]);

    const shopAvg   = shopStats.length > 0
      ? Number(shopStats[0].averageRating.toFixed(2))
      : 0;
    const shopCount = shopStats.length > 0 ? shopStats[0].ratingCount : 0;

    await Shop.findByIdAndUpdate(shopObjectId, {
      rating:      shopAvg,
      ratingCount: shopCount
    });

    return res.status(200).json({
      message:    "Rating submitted successfully",
      itemRating: itemAvg,
      itemRatingCount: itemCount,
      shopRating: shopAvg,
      shopRatingCount: shopCount
    });

  } catch (error) {
    console.error("ADD_RATING_ERR:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Rating already exists for this order item" });
    }
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// GET RATINGS FOR AN ITEM
// ─────────────────────────────────────────────
export const getItemRatings = async (req, res) => {
  try {
    const { itemId } = req.params;

    const ratings = await Rating.find({ item: itemId })
      .populate("user", "fullName")
      .sort({ createdAt: -1 }); // newest first

    return res.status(200).json({ success: true, ratings });
  } catch (error) {
    console.error("GET_ITEM_RATINGS_ERR:", error);
    return res.status(500).json({ message: "Error fetching ratings" });
  }
};

// ─────────────────────────────────────────────
// GET RATINGS FOR A SHOP
// ─────────────────────────────────────────────
export const getShopRatings = async (req, res) => {
  try {
    const { shopId } = req.params;

    const ratings = await Rating.find({ shop: shopId })
      .populate("user", "fullName")
      .populate("item", "name image")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, ratings });
  } catch (error) {
    console.error("GET_SHOP_RATINGS_ERR:", error);
    return res.status(500).json({ message: "Error fetching shop reviews" });
  }
};


