import mongoose from "mongoose";

/*
  FINAL Shop Schema - production friendly
*/
const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // URL to image (cloudinary) shown to users
    image: { type: String, required: false, default: null },

    // Cloudinary public id so we can delete the image later
    imagePublicId: { type: String, required: false, default: null },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    // Items (references)
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item"
      }
    ],

    // Ratings
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Business / UX fields
    isOpen: { type: Boolean, default: true },               // open/closed
    isActive: { type: Boolean, default: true },             // soft delete
    isDeliveryAvailable: { type: Boolean, default: true },  // delivery on/off

    // Optional metadata
    shopType: [{ type: String, trim: true }],               // tags e.g. ["North Indian","Bakery"]
    description: { type: String, trim: true, default: "" },

    // Geo (optional, useful later)
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    // Times (minutes)
    prepTime: { type: Number, default: 15 },     // typical preparation time
    deliveryTime: { type: Number, default: 30 }  // expected delivery time
  },
  { timestamps: true }
);

// Indexes for common queries
shopSchema.index({ city: 1 });
shopSchema.index({ owner: 1 });
shopSchema.index({ isActive: 1 });

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
