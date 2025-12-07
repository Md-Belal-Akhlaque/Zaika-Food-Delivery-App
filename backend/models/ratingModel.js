import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Prevent multiple ratings by same user for same item (optional, but good for consistency)
ratingSchema.index({ user: 1, item: 1 }, { unique: true });

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;
