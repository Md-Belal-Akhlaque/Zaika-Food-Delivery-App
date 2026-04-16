import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  id: { 
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  label: { type: String, required: [true, 'Address label is required'] },
  address: { type: String, required: [true, 'Full address is required'] },
  location: { 
    lat: { type: Number, min: -90, max: 90 },
    lon: { type: Number, min: -180, max: 180 }
  },
  pincode: { type: String, required: [true, 'Pincode is required'] },
  extraDetails: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },

    // FIX: lowercase:true so John@gmail.com and john@gmail.com don't create two accounts
    email: { 
      type: String, 
      required: true, 
      // unique: true, 
      lowercase: true, 
      trim: true 
    },

    password: { type: String },

    mobile: { 
      type: String, 
      required: true,
      unique: true // ✅ FIX: prevent duplicate numbers
    },

    role: {
      type: String,
      enum: ["user", "owner", "deliveryPartner"],
      required: true,
    },

    // Auth / OTP
    resetOtp:      { type: String,  default: null },
    otpExpires:    { type: Date,    default: null },
    isOtpVerified: { type: Boolean, default: false },

    otpAttempts: { type: Number, default: 0 },
    otpBlockedUntil: { type: Date, default: null },

    // Profile image (added — was missing from original)
    profileImage:         { type: String, default: null },
    profileImagePublicId: { type: String, default: null },

    addresses: [addressSchema],

    // FIX: was using a broken default:function() — this is just a plain Boolean now
    // Role-based logic for isAvailable is handled in controllers/services, not here
    isAvailable: { type: Boolean, default: false },
    isBusy: { type: Boolean, default: false },

    // Metrics for delivery partners
    rating:           { type: Number, default: 0, min: 0, max: 5 },
    ratingCount:      { type: Number, default: 0, min: 0 },
    totalDeliveries:  { type: Number, default: 0, min: 0 },
    earnings:         { type: Number, default: 0, min: 0 },

    // Soft delete — added (was missing, needed to block/deactivate accounts)
    isActive: { type: Boolean, default: true },

    // Geolocation — only populated for deliveryPartners
    // FIX: NO default coordinates — removed default:[0,0] which was placing
    // every user at Gulf of Guinea (0,0) in geo queries
    location: {
      type: {
        type: String,
        enum: ["Point"],
        // default: "Point" //  FIX
      },
      coordinates: { 
        type: [Number], // [longitude, latitude] — GeoJSON order
        validate: {     //  FIX: ensure proper format
          validator: function (val) {
            if (!val) return true;
            return val.length === 2;
          },
          message: "Coordinates must be [longitude, latitude]"
        }
      }
    }
  },
  { timestamps: true }
);

// FIX: sparse:true — only indexes documents that HAVE a location field
userSchema.index({ location: "2dsphere" }, { sparse: true });

// Added: index for OTP lookup during password reset flow
userSchema.index({ resetOtp: 1 }, { sparse: true });

// Added: compound index for the delivery partner availability query
userSchema.index({ role: 1, isAvailable: 1, isActive: 1 });
userSchema.index({ role: 1, isBusy: 1, isActive: 1 });

// ✅ FIX: case-insensitive email uniqueness
userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// ✅ FIX: password hashing + role cleanup
// userSchema.pre("save", async function (next) {
//   if (this.isModified("password") && this.password) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }

  // only delivery partner should have location
//   if (this.role !== "deliveryPartner") {
//     this.location = undefined;
//     this.isAvailable = false;
//   }

//   next();
// });

// ✅ helper method
// userSchema.methods.comparePassword = function (password) {
//   return bcrypt.compare(password, this.password);
// };

export default mongoose.model("User", userSchema);

