import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  id: { type: String },
  label: { type: String },
  address: { type: String },
  location: {
    lat: Number,
    lon: Number,
  },
  pincode: String,
  extraDetails: String,
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    mobile: { type: String, required: true },

    role: {
      type: String,
      enum: ["user", "owner", "deliveryPartner"],
      required: true,
    },

    resetOtp: String,
    isOtpVerified: { type: Boolean, default: false },
    otpExpires: Date,

    addresses: [addressSchema],
    
    //  FIX: Add isAvailable field for delivery partners
    isAvailable: {
      type: Boolean,
      default: function() {
        return this.role === 'deliveryPartner' ? false : undefined;
      }
    },
    
    // For Delivery Partners (Current Location)
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    }
  },
  { timestamps: true }
);

//  Geospatial index for location queries
userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
