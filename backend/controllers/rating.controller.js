import mongoose from "mongoose";
import Rating from "../models/ratingModel.js";
import Item from "../models/itemModel.js";
import Shop from "../models/shopModel.js";

export const addRating = async (req, res) => {
    try {
        const { itemId, shopId, rating, review } = req.body;
        const userId = req.userId;

        if (!itemId || !shopId || !rating) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Upsert rating
        const existingRating = await Rating.findOne({ user: userId, item: itemId });

        if (existingRating) {
            existingRating.rating = rating;
            existingRating.review = review;
            await existingRating.save();
        } else {
            await Rating.create({
                user: userId,
                item: itemId,
                shop: shopId,
                rating,
                review
            });
        }

        // Recalculate Item Rating
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

        // Recalculate Shop Rating
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

        res.status(200).json({ message: "Rating submitted successfully", itemRating: itemAvg, shopRating: shopAvg });

    } catch (error) {
        console.error("Error adding rating:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getItemRatings = async (req, res) => {
    try {
        const { itemId } = req.params;
        const ratings = await Rating.find({ item: itemId }).populate("user", "fullName");
        res.status(200).json(ratings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching ratings" });
    }
};
