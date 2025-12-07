import express from "express";
import { 
    signUp,
    signIn,
    signOut,
    sendOtp, 
    verifyOtp,resetPassword} from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.post("/signup", signUp);
authRouter.post("/signin", signIn);
authRouter.post("/signout", signOut);

authRouter.post("/forgotPassword/send-otp",sendOtp);
authRouter.post("/forgotPassword/verify-otp",verifyOtp);
authRouter.post("/forgotPassword/reset-password",resetPassword);

export default authRouter;
