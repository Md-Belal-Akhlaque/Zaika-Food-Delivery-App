import mongoose from "mongoose";

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

    // Added: link to the order that contained this item
    // This lets you enforce "only rate items you actually ordered"
    // Without this, any user can rate any item they've never bought
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
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
        trim: true,
        default: null,
        maxlength: 500, // added: prevent huge review text

        // ✅ FIX: avoid empty / useless reviews
        minlength: 3
    }

}, { timestamps: true });


// Prevent SAME USER from rating SAME ITEM more than once
// (unique compound index — unchanged, this was already correct)
// ✅ FIX: extended with order to allow rating same item in different orders
ratingSchema.index(
    { user: 1, item: 1, order: 1 },
    { unique: true }
);

// Added: fetch all ratings for a shop quickly (shop dashboard / shop page)
ratingSchema.index({ shop: 1, createdAt: -1 });

// Added: fetch all ratings for a specific item
ratingSchema.index({ item: 1 });

// ✅ EXTRA: fast lookup for user's ratings (profile page / history)
ratingSchema.index({ user: 1, createdAt: -1 });

// ✅ OPTIONAL SAFETY: prevent duplicate same rating spam (same rating + review)
ratingSchema.index(
    { user: 1, item: 1, rating: 1, review: 1 },
    { unique: false }
);

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;





// import mongoose from "mongoose";

// /*
//   ⭐ RATING SCHEMA - SIMPLE + BEGINNER FRIENDLY

//   This schema stores:
//   - Which user rated
//   - Which item they rated
//   - Which shop the item belongs to
//   - How many stars (1–5)
//   - Optional written review
//   - Timestamps (createdAt, updatedAt)
// */

// const ratingSchema = new mongoose.Schema({

//     // Who gave the rating
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true
//     },

//     // Which item was rated
//     item: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Item",
//         required: true
//     },

//     // Which shop this item belongs to
//     shop: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Shop",
//         required: true
//     },

//     // Star rating (1 to 5 only)
//     rating: {
//         type: Number,
//         required: true,
//         min: 1,
//         max: 5
//     },

//     // Optional written review
//     review: {
//         type: String,
//         trim: true
//     }

// }, { timestamps: true });


// // ------------------------------------------------------------
// // Prevent SAME USER from rating SAME ITEM more than once
// // ------------------------------------------------------------
// ratingSchema.index(
//     { user: 1, item: 1 },
//     { unique: true }
// );

// const Rating = mongoose.model("Rating", ratingSchema);

// export default Rating;
