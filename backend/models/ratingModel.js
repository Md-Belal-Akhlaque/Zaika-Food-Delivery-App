import mongoose from "mongoose";

/*
   RATING SCHEMA - SIMPLE + BEGINNER FRIENDLY

  This schema stores:
  - Which user rated
  - Which item they rated
  - Which shop the item belongs to
  - How many stars (1–5)
  - Optional written review
  - Timestamps (createdAt, updatedAt)
*/

const ratingSchema = new mongoose.Schema({

    // Who gave the rating
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Which item was rated
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true
    },

    // Which shop this item belongs to
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },

    // Star rating (1 to 5 only)
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    // Optional written review
    review: {
        type: String,
        trim: true
    }

}, { timestamps: true });


// ------------------------------------------------------------
// Prevent SAME USER from rating SAME ITEM more than once
// ------------------------------------------------------------
ratingSchema.index(
    { user: 1, item: 1 },
    { unique: true }
);

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;
