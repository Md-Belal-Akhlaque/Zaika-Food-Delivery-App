import dotenv from 'dotenv'
dotenv.config();
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  service: "Gmail",
// host:
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

export const sendOtpMail = async(to,otp)=>{
    await transport.sendMail({
        from:process.env.EMAIL,
        to,
        subject:"Reset Your Password",
        html:`<p>Your OTP for password reset is <b>${otp}</b> .It expires in 5 minutes.</p>`
    })
}

