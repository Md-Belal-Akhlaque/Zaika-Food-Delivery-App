import mongoose from "mongoose";

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

    city:    { type: String, required: true, trim: true },
    state:   { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    // REMOVED: items array — was causing a major performance problem.
    // When a shop has 200 items, every Shop.findById() was loading 200 ObjectIds.
    // Adding/removing an item rewrote the entire shop document.
    // Items already have shop:ObjectId on them — use Item.find({ shop: shopId }) instead.
    // ❌ items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }]

    // Ratings
    // FIX: added min/max constraints — a $set:{rating:999} can no longer corrupt this
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    // Business / UX fields
    isOpen:              { type: Boolean, default: true },  // open/closed toggle
    isActive:            { type: Boolean, default: true },  // soft delete
    isDeliveryAvailable: { type: Boolean, default: true },  // delivery on/off

    // Optional metadata
    shopType:    [{ type: String, trim: true }], // e.g. ["North Indian","Bakery"]
    description: { type: String, trim: true, default: "" },

    // FIX: replaced flat latitude/longitude fields with GeoJSON Point
    // The old latitude:Number, longitude:Number fields could NOT be used with
    // MongoDB $near queries — so "shops within 5km" was impossible.
    // GeoJSON Point format enables the 2dsphere index and all geo queries.
    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined } // [longitude, latitude]
    },

    // Times (minutes)
    prepTime:     { type: Number, default: 15 }, // typical preparation time
    deliveryTime: { type: Number, default: 30 }  // expected delivery time
  },
  { timestamps: true }
);

// FIX: combined city + isActive into compound index — most shop queries filter both
shopSchema.index({ city: 1, isActive: 1 });
shopSchema.index({ owner: 1 });

// Added: 2dsphere index for geo queries like "find shops within 5km"
// sparse:true — shops without coordinates won't block the index
shopSchema.index({ location: "2dsphere" }, { sparse: true });

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;



