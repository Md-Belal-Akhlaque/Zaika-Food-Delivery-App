import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import genToken from "../utility/token.js";
import { generateOtp } from "../utility/otp.js";
import { sendOtpMail } from "../utility/mail.js";

// ========================= SIGN UP =========================
export const signUp = async (req, res) => {
  try {
    const { fullName, email, password, mobile, role } = req.body;
    const emailTrim = email.trim().toLowerCase();

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ message: "Mobile already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await User.create({
        fullName,
        email: emailTrim,
        password: hashedPassword,
        mobile,
        role: role || "user"
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "Email already exists" });
      }
      throw err;
    }

    const token = await genToken(user._id, user.role);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      }
    });

  } catch (error) {
    return res.status(500).json({ message: `Signup Error: ${error.message}` });
  }
};

export const onboardSignUp = async (req, res) => {
  try {
    const { fullName, email, password, mobile, role, onboardingCode } = req.body;
    const emailTrim = email.trim().toLowerCase();
    const allowedRoles = new Set(["owner", "deliveryPartner"]);

    if (!allowedRoles.has(role)) {
      return res.status(400).json({ message: "Invalid onboarding role" });
    }

    const requiredCode = process.env.STAFF_ONBOARDING_CODE;
    if (!requiredCode) {
      return res.status(503).json({ message: "Onboarding is not configured" });
    }

    if (String(onboardingCode || "").trim() !== String(requiredCode).trim()) {
      return res.status(403).json({ message: "Invalid onboarding code" });
    }

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ message: "Mobile already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await User.create({
        fullName,
        email: emailTrim,
        password: hashedPassword,
        mobile,
        role,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "Email already exists" });
      }
      throw err;
    }

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully! Please sign in.`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: `Onboarding signup error: ${error.message}` });
  }
};


// ========================= SIGN IN =========================
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailTrim = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailTrim });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // FIX: check if account is active — deactivated users should not be able to login
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = await genToken(user._id, user.role);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token: token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      }
    });

  } catch (error) {
    return res.status(500).json({ message: `Signin Error: ${error.message}` });
  }
};


// ========================= SIGN OUT =========================
export const signOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({ success: true, message: "Logout successful" });

  } catch (error) {
    res.status(500).json({ message: `Logout Failed: ${error.message}` });
  }
};


// ========================= SEND OTP =========================
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const emailTrim = email.trim().toLowerCase();

    const user = await User.findOne({ email: emailTrim });

    if (!user) {
      return res.status(400).json({ message: "User doesn't exist" });
    }

    // Block if user is locked
    // FIX: otpBlockedUntil and otpAttempts were used here but were MISSING
    // from userModel.js — added them below in the model update section
    if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
      return res.status(429).json({ message: "Too many attempts. Try after 15 minutes." });
    }

    // Rate limit: 1 OTP per minute
    if (user.otpExpires && user.otpExpires > Date.now() - 60000) {
      return res.status(429).json({ message: "Wait before requesting OTP again" });
    }

    const otp = generateOtp();

    user.resetOtp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.isOtpVerified = false;
    user.otpAttempts = 0;

    await user.save();
    await sendOtpMail(emailTrim, otp);

    return res.status(200).json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    return res.status(500).json({ message: `Error sending OTP: ${error.message}` });
  }
};


// ========================= VERIFY OTP =========================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailTrim = email.trim().toLowerCase();

    const user = await User.findOne({ email: emailTrim });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Block check
    if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
      return res.status(429).json({ message: "Too many attempts. Try after 15 minutes." });
    }

    // Wrong OTP or expired
    if (
      String(user.resetOtp) !== String(otp) ||
      user.otpExpires < Date.now()
    ) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      // Block after 3 wrong attempts
      if (user.otpAttempts >= 3) {
        user.otpBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.otpAttempts = 0;
      }

      await user.save();

      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Success
    user.isOtpVerified = true;
    // FIX: was using undefined — Mongoose ignores undefined, field never clears
    // Use null to actually clear the field in MongoDB
    user.resetOtp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    // FIX: also clear the block on success
    user.otpBlockedUntil = null;

    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified" });

  } catch (error) {
    return res.status(500).json({ message: `OTP verification error: ${error.message}` });
  }
};


// ========================= RESET PASSWORD =========================
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const emailTrim = email.trim().toLowerCase();

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: emailTrim });

    if (!user || !user.isOtpVerified) {
      return res.status(400).json({ message: "OTP not verified" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.isOtpVerified = false;

    await user.save();

    return res.status(200).json({ success: true, message: "Password changed successfully" });

  } catch (error) {
    return res.status(500).json({ message: `Reset password error: ${error.message}` });
  }
};
