import express from "express";
import { 
    signUp,
    onboardSignUp,
    signIn,
    signOut,
    sendOtp, 
    verifyOtp,resetPassword} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { 
    signUpSchema, 
    onboardSignUpSchema,
    signInSchema, 
    sendOtpSchema, 
    verifyOtpSchema, 
    resetPasswordSchema 
} from "../validations/auth.validation.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js";

const authRouter = express.Router();

authRouter.post("/signup", authLimiter, validate(signUpSchema), signUp);
authRouter.post("/onboard-signup", authLimiter, validate(onboardSignUpSchema), onboardSignUp);
authRouter.post("/signin", authLimiter, validate(signInSchema), signIn);
authRouter.post("/signout", signOut);

authRouter.post("/forgotPassword/send-otp", otpLimiter, validate(sendOtpSchema), sendOtp);
authRouter.post("/forgotPassword/verify-otp", authLimiter, validate(verifyOtpSchema), verifyOtp);
authRouter.post("/forgotPassword/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);

export default authRouter;
