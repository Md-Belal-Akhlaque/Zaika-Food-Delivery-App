import mongoose from "mongoose";
import Rating from "../models/ratingModel.js";
import Item from "../models/itemModel.js";
import Shop from "../models/shopModel.js";
import Order from "../models/orderModel.js";   // <-- Added (needed for purchase check)

// ------------------------------------------------------
// ADD OR UPDATE RATING (BEGINNER FRIENDLY VERSION)
// ------------------------------------------------------
export const addRating = async (req, res) => {
    try {
        const { itemId, shopId, rating, review } = req.body;
        const userId = req.userId;

        // -------------------------------
        // 1) Basic validation
        // -------------------------------
        if (!itemId || !shopId || !rating) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if rating is between 1 and 5
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        // ---------------------------------------------------------
        // 2) Check if user has actually purchased this item
        // ---------------------------------------------------------
        // We search Orders where:
        // - The user is the buyer
        // - The item exists in any of the shopOrders
        const hasBought = await Order.findOne({
            user: userId,
            "shopOrders.shopOrderItems.item": itemId
        });

        if (!hasBought) {
            return res.status(403).json({
                message: "You can only rate items you have purchased"
            });
        }

        // ---------------------------------------------------------
        // 3) Check if the user already rated this item (UPSERT)
        // ---------------------------------------------------------
        const existingRating = await Rating.findOne({
            user: userId,
            item: itemId
        });

        if (existingRating) {
            // If rating exist → update it
            existingRating.rating = rating;
            existingRating.review = review;
            await existingRating.save();
        } else {
            // If not → create a new rating
            await Rating.create({
                user: userId,
                item: itemId,
                shop: shopId,
                rating,
                review
            });
        }

        // ---------------------------------------------------------
        // 4) Recalculate Item Avg Rating (beginner friendly)
        // ---------------------------------------------------------
        const itemStats = await Rating.aggregate([
            { $match: { item: new mongoose.Types.ObjectId(itemId) } },
            {
                $group: {
                    _id: "$item",
                    averageRating: { $avg: "$rating" },
                    ratingCount: { $sum: 1 }
                }
            }
        ]);

        let itemAvg = 0;
        let itemCount = 0;

        if (itemStats.length > 0) {
            itemAvg = itemStats[0].averageRating;
            itemCount = itemStats[0].ratingCount;
        }

        await Item.findByIdAndUpdate(itemId, {
            rating: itemAvg,
            ratingCount: itemCount
        });

        // ---------------------------------------------------------
        // 5) Recalculate Shop Avg Rating (beginner friendly)
        // ---------------------------------------------------------
        const shopStats = await Rating.aggregate([
            { $match: { shop: new mongoose.Types.ObjectId(shopId) } },
            {
                $group: {
                    _id: "$shop",
                    averageRating: { $avg: "$rating" },
                    ratingCount: { $sum: 1 }
                }
            }
        ]);

        let shopAvg = 0;
        let shopCount = 0;

        if (shopStats.length > 0) {
            shopAvg = shopStats[0].averageRating;
            shopCount = shopStats[0].ratingCount;
        }

        await Shop.findByIdAndUpdate(shopId, {
            rating: shopAvg,
            ratingCount: shopCount
        });

        return res.status(200).json({
            message: "Rating submitted successfully",
            itemRating: itemAvg,
            shopRating: shopAvg
        });

    } catch (error) {
        console.error("Error adding rating:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const getItemRatings = async (req, res) => {
    try {
        const { itemId } = req.params;

        // Fetch all ratings for item
        // Populate → so we also get user name who rated
        const ratings = await Rating.find({ item: itemId })
            .populate("user", "fullName");

        return res.status(200).json(ratings);
    } catch (error) {
        console.error("Error fetching ratings:", error);
        res.status(500).json({ message: "Error fetching ratings" });
    }
};

export const getShopRatings = async (req, res) => {
    try {
        const { shopId } = req.params;

        const ratings = await Rating.find({ shop: shopId })
            .populate("user", "fullName")
            .populate("item", "name image");

        return res.status(200).json(ratings);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching shop reviews" });
    }
};
