import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import genToken from "../utility/token.js";
import { generateOtp } from "../utility/otp.js";
import { sendOtpMail } from "../utility/mail.js";


// ========================= SIGN UP =========================
export const signUp = async (req, res) => {
  try {
    const { fullName, email, password, mobile, role } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim() || !mobile?.trim()) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailTrim = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailTrim });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({ message: "Mobile number must be 10 digits" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: emailTrim,
      password: hashedPassword,
      mobile,
      role: role || "user"
    });

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const safeUser = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    return res.status(201).json({ message: "User registered successfully!", user: safeUser });

  } catch (error) {
    return res.status(500).json({ message: `Signup Error: ${error.message}` });
  }
};


// ========================= SIGN IN =========================
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const emailTrim = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailTrim });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // FIXED: Added missing await
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const safeUser = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    return res.status(200).json({ message: "Login successful!", user: safeUser });

  } catch (error) {
    return res.status(500).json({ message: `Signin Error: ${error.message}` });
  }
};


// ========================= SIGN OUT =========================
export const signOut = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: `Logout Failed: ${error.message}` });
  }
};


// ========================= SEND OTP =========================
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const emailTrim = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: emailTrim });

    if (!existingUser) {
      return res.status(400).json({ message: "User doesn't exist" });
    }

    const otp = generateOtp();
    existingUser.resetOtp = otp;
    existingUser.otpExpires = Date.now() + 5 * 60 * 1000;
    existingUser.isOtpVerified = false;

    await existingUser.save();
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

    //here user.resetOtp != otp
    if (!user || user.resetOtp !== String(otp) || user.otpExpires < Date.now()) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;

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

    const user = await User.findOne({ email: emailTrim });

    if (!user || !user.isOtpVerified) {
      return res.status(400).json({ success: false, message: "OTP not verified" });
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
