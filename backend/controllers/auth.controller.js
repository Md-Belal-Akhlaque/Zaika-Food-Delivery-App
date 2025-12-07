import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import genToken from "../utility/token.js";
import { generateOtp } from "../utility/otp.js";
import { sendOtpMail } from "../utility/mail.js";

export const signUp = async (req, res) => {
  try {
    const { fullName, email, password, mobile, role } = req.body;

    // 1. Check all fields exist
    if (
      !fullName ||
      fullName.trim() === "" ||
      !email ||
      email.trim() === "" ||
      !password ||
      password.trim() === "" ||
      !mobile ||
      mobile.trim() === ""
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Email check
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3. Password validation
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 chars" });
    }

    // 4. Mobile validation
    if (mobile.length !== 10) {
      return res
        .status(400)
        .json({ message: "Mobile number must be 10 digits" });
    }

    // 5. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Create User
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      mobile,
      role: role || "user", // Prevent users from sending "admin"
    });

    // 7. Create Token
    const token = await genToken(user._id);

    // 8. Set Cookie (Best Practice)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // 9. Remove password before sending back
    const safeUser = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    return res.status(201).json({
      message: "User registered successfully!",
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: `Signup Error: ${error}` });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 2. Check user exist or not
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Compare password
    const isMatch =  bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 4. Generate Token
    const token = await genToken(user._id);

    // 5. Set Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // 6. Remove password before sending response
    const safeUser = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    return res.status(201).json({
      message: "User Login successfully!",
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: `Signin Error: ${error}` });
  }
};

export const signOut = async (req, res) => {
  try {
    //double inverted comman me jo hai wo browser par token name se save hoga isko ham kuch bhi de sakte hai its like browser variable name that store jwt_secret
    
    // res.cookie('token','',{...cookieOptions,maxAge:1});
    res.clearCookie("token");
    return res.status(200).json({ message: "LogOut successful" });
  } catch (e) {
    res.status(500).json({ message: `LogOut Failed ${e}` });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User doesn't exists" });
    }
    //before sending otp to user database me save karenge
    else {
      const otp = generateOtp();
      existingUser.resetOtp = otp;
      existingUser.otpExpires = Date.now() + 5 * 60 * 1000;
      existingUser.isOtpVerified = false;

      await existingUser.save();
      await sendOtpMail(email, otp);

      return res
        .status(200)
        .json({ success: true, message: "OTP send successfully" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error occured in sending otp" });
  }
};

export const verifyOtp = async (req, res) => {
try{
    const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.resetOtp != otp || user.otpExpires < Date.now())
    return res.status(401).json({ message: "Invalid or Expired Otp." });
  else {
    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return res.status(200).json({ success: true, message: "OTP verified" });
  }
}catch(error)
{
  return res.status(500).json({success:false,message:`send OTP error`});
}
};

export const resetPassword = async(req,res) =>{
  try {
    const {email,newPassword} = req.body;
    const user = await User.findOne({email});

    if(!user || !user.isOtpVerified){
      return res.status(400).json({success:false,message:"otp not verified"});
    }
    const hashedPassword = await bcrypt.hash(newPassword,10);
    user.password= hashedPassword;
    user.isOtpVerified= false;

    await user.save();
    return res.status(200).json({success:true,message:"Password changed Successfully"});

  } catch (error) {
    return res.status(500).json(`reset password error${error}`);
  }
}
