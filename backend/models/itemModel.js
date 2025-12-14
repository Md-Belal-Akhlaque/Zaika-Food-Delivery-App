import mongoose from "mongoose";

/*
   FINAL ITEM SCHEMA (Real Delivery App Ready)

  Includes:
  - Correct categories (industry-standard)
  - Variants (small/medium/large)
  - Addons (extra cheese etc.)
  - Discount price
  - Prep time
  - isAvailable (out of stock)
  - isActive (soft delete)
  - Rating system fields
*/

const itemSchema = new mongoose.Schema(
  {
    // Basic Item Details
    name: {
      type: String,
      required: true,
      trim: true
    },

    image: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    // Optional Offer Price
    discountPrice: {
      type: Number,
      default: null
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    //  Updated Real-World Categories
    category: {
      type: String,
      enum: [
        "Starters",
        "Main Course",
        "Desserts",
        "Pizza",
        "Burger",
        "Sandwiches",
        "North Indian",
        "South Indian",
        "Chinese",
        "Street Food",
        "Beverages",
        "Others"
      ],
      required: true
    },

    // Veg / Non-Veg
    foodType: {
      type: String,
      enum: ["veg", "non-veg"],
      lowercase: true,
      required: true
    },

    // Shop reference
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    //  NEW — Item availability toggle
    isAvailable: {
      type: Boolean,
      default: true
    },

    //  NEW — Soft delete (don’t show but keep in DB)
    isActive: {
      type: Boolean,
      default: true
    },

    //  NEW — Variants (Small/Medium/Large)
    variants: [
      {
        name: { type: String, trim: true },
        price: Number
      }
    ],

    //  NEW — Addons (Extra Cheese, Mayo, Sauce)
    addons: [
      {
        title: { type: String, trim: true },
        price: Number
      }
    ],

    //  NEW — Prep Time for Delivery ETA
    prepTime: {
      type: Number,
      default: 10 // minutes
    },

    // Ratings
    rating: {
      type: Number,
      default: 0
    },

    ratingCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Performance indexes
itemSchema.index({ shop: 1 });
itemSchema.index({ category: 1 });

const Item = mongoose.model("Item", itemSchema);

export default Item;
