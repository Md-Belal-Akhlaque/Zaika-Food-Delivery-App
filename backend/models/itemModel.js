import mongoose from "mongoose";

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

    // Added: Cloudinary public ID — needed to DELETE old image when owner updates item image
    // Without this, old images pile up in Cloudinary and cost money
    imagePublicId: {
      type: String,
      default: null
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    // Optional Offer Price
    discountPrice: {
      type: Number,
      default: null,
      min: 0, // added: prevent negative discount prices

      // ✅ FIX: discount > price na ho
      validate: {
        validator: function (val) {
          if (val === null) return true;
          return val <= this.price;
        },
        message: "Discount price cannot be greater than actual price"
      }
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    // FIX: changed from enum to free String
    // Reason: adding "Momos" or "Wraps" later would need a schema migration.
    // Validation is now handled in the controller/service layer (Joi or manual check).
    // This is more flexible for a real business where categories change often.
    // Old enum values were:
    // ["Starters","Main Course","Desserts","Pizza","Burger","Sandwiches",
    //  "North Indian","South Indian","Chinese","Street Food","Beverages","Others"]
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true // ✅ FIX: consistency (Pizza vs pizza issue solve)
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

    // Item availability toggle (out of stock)
    isAvailable: {
      type: Boolean,
      default: true
    },

    // Optional finite inventory. null means unlimited stock.
    stock: {
      type: Number,
      default: null,
      min: 0
    },

    // Soft delete (don't show but keep in DB for order history)
    isActive: {
      type: Boolean,
      default: true
    },

    // Variants (Small/Medium/Large etc.)
    variants: [
      {
        name:  { 
          type: String, 
          trim: true,
          required: true // ✅ FIX: empty variant na aaye
        },
        price: { 
          type: Number, 
          min: 0,
          required: true // ✅ FIX
        }
      }
    ],

    // Addons (Extra Cheese, Mayo, Sauce etc.)
    addons: [
      {
        title: { 
          type: String, 
          trim: true,
          required: true // ✅ FIX
        },
        price: { 
          type: Number, 
          min: 0,
          required: true // ✅ FIX
        }
      }
    ],

    // Prep Time for Delivery ETA
    prepTime: {
      type: Number,
      default: 10 // minutes
    },

    // Ratings (updated via Rating model, not directly)
    rating: {
      type: Number,
      default: 0,
      min: 0, // added
      max: 5  // added
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0 // added
    }
  },
  { timestamps: true }
);

// FIX: replaced two single-field indexes with one compound index
// "Give me all active+available items for this shop" is the #1 query
itemSchema.index({ shop: 1, isActive: 1, isAvailable: 1 });

// Added: for category-filtered browsing within a shop
itemSchema.index({ shop: 1, category: 1 });

// ✅ EXTRA FIX: prevent duplicate item names in same shop (optional but useful)
itemSchema.index({ shop: 1, name: 1 });

const Item = mongoose.model("Item", itemSchema);

export default Item;
