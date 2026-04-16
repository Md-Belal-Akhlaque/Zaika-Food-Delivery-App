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

    // 1. Basic validation
    if (!itemId || !shopId || !rating) {
      return res.status(400).json({ message: "itemId, shopId and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // 2. Verify purchase
    // FIX: old query used "shopOrders.shopOrderItems.item" — embedded subdocument path
    // ShopOrder is now a separate collection — must query it directly
    const boughtShopOrder = await ShopOrder.findOne({
      order: {
        $in: await Order.find({ user: userId }).distinct("_id")
      },
      "items.item": new mongoose.Types.ObjectId(itemId)
    });

    if (!boughtShopOrder) {
      return res.status(403).json({
        message: "You can only rate items you have purchased"
      });
    }

    // 3. Upsert rating
    // FIX: added order field — it's required in ratingModel.js
    const existingRating = await Rating.findOne({ user: userId, item: itemId });

    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review || null;
      await existingRating.save();
    } else {
      await Rating.create({
        user:   userId,
        item:   itemId,
        shop:   shopId,
        order:  boughtShopOrder.order, // FIX: was missing — required field
        rating,
        review: review || null
      });
    }

    // 4. Recalculate item average rating
    // FIX: added Number().toFixed(2) rounding — was storing 4.666666
    const itemStats = await Rating.aggregate([
      { $match: { item: new mongoose.Types.ObjectId(itemId) } },
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

    await Item.findByIdAndUpdate(itemId, {
      rating:      itemAvg,
      ratingCount: itemCount
    });

    // 5. Recalculate shop average rating
    const shopStats = await Rating.aggregate([
      { $match: { shop: new mongoose.Types.ObjectId(shopId) } },
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

    await Shop.findByIdAndUpdate(shopId, {
      rating:      shopAvg,
      ratingCount: shopCount
    });

    return res.status(200).json({
      message:    "Rating submitted successfully",
      itemRating: itemAvg,
      shopRating: shopAvg
    });

  } catch (error) {
    console.error("ADD_RATING_ERR:", error);
    return res.status(500).json({ message: "Internal server error" });
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


