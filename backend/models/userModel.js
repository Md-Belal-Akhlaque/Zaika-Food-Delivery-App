import mongoose from "mongoose";
//pahle curly bracket me model and second me timestmap
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    mobile: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "owner", "deliveryPartner"],
      required: true,
    },
    //adding field to do stuff related to otp and forgot password
    resetOtp: {
      type: String,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otpExpires: {
        type:Date,
    },
    addresses: [
      {
        id: { type: String },
        label: { type: String },
        address: { type: String },
        location: {
          lat: { type: Number },
          lon: { type: Number },
        },
        pincode: { type: String },
        extraDetails: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
