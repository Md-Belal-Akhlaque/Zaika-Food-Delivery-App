import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import axios from 'axios';
import { serverURL } from "../../config";

const Forgot = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Mock database email

  const colors = {
    primary: "#ff6b35",
    hover: "#e85d2b",
    focusGlow: "rgba(255, 107, 53, 0.4)",
    border: "#ff9f68",
    bg: "#fff3e9",
    cardBg: "rgba(255, 255, 255, 0.85)",
    textDark: "#3b2f2f",
  };

  // Step 1: Email check

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};


    try {
      const response = await axios.post(
        `${serverURL}/api/auth/forgotPassword/send-otp`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
          }
        }
      );

      // Agar backend success bheje to next step
      if (response.data.success) {
        alert(`OTP sent to ${email}`);
        setStep(2);
      } else {
        newErrors.email = response.data.message || "This email is not registered!";
        setErrors(newErrors);
      }
    } catch (error) {
      newErrors.email = error.response?.data?.message || "Error sending OTP";
      setErrors(newErrors);
    }
  };



  // Step 2: OTP verification
  const handleOtp = async (e) => {
    e.preventDefault();
    const newErrors = {};

    try {
      const response = await axios.post(
        `${serverURL}/api/auth/forgotPassword/verify-otp`,
        { email, otp },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
          }
        }
      );

      if (response.data.success) {
        alert("OTP verified successfully!");
        setStep(3);
      } else {
        newErrors.otp = response.data.message || "Invalid OTP! Please try again.";
        setErrors(newErrors);
      }
    } catch (error) {
      newErrors.otp = error.response?.data?.message || "Error verifying OTP";
      setErrors(newErrors);
    }
  };


  // Step 3: Password reset
  const handlePassword = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long.";
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const response = await axios.post(`${serverURL}/api/auth/forgotPassword/reset-password`, {
          email,
          newPassword: confirmPassword,
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
          }
        });

        if (response.data.success) {
          setSuccess(true);
          setLoading(false);

          // Redirect to login after success
          setTimeout(() => {
            navigate("/signin");
          }, 2000);
        } else {
          alert(response.data.message || "Failed to reset password");
        }
      } catch (error) {
        alert(error.response?.data?.message || "Error resetting password");
      }
    }
  };
  const togglePassword = () => setShowPassword((prev) => !prev);

  const checkStrength = (value) => {
    setPassword(value);
    if (value.length < 6) setStrength("Weak 😕");
    else if (!/[A-Z]/.test(value)) setStrength("Medium ⚠️ (Add uppercase)");
    else if (/[A-Z]/.test(value) && /\d/.test(value)) setStrength("Strong 💪");
    else setStrength("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `linear-gradient(135deg, ${colors.bg}, #ffe0c7)`,
      }}
    >
      <div
        className="max-w-md w-full rounded-2xl shadow-xl p-8 backdrop-blur-md transition-all duration-300"
        style={{ backgroundColor: colors.cardBg }}
      >
        <h2
          className="text-3xl font-bold mb-6 text-center"
          style={{ color: colors.textDark }}
        >
          Forgot Password?
        </h2>

        {/*  Success Message */}
        {success && (
          <div className="text-center mb-4 animate-bounce">
            <p className="text-green-600 font-semibold">
              Password Reset Successfully! Redirecting to Login...
            </p>
          </div>
        )}

        {/* Step 1 - Email */}
        {step === 1 && !success && (
          <form onSubmit={handleSubmit}>
            <p className="text-center mb-6 text-sm text-gray-600">
              Enter your email address to get OTP.
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                style={{ borderColor: colors.border, backgroundColor: "white" }}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1 font-medium">
                  {errors.email}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full font-semibold py-2 rounded-lg active:bg-[#ff9f68] transition-all duration-300 "
              style={{
                backgroundColor: colors.primary,
                color: "white",
              }}
            >
              Send OTP
            </button>
          </form>
        )}

        {/* Step 2 - OTP */}
        {step === 2 && !success && (
          <form onSubmit={handleOtp}>
            <p className="text-center mb-6 text-sm text-gray-600">
              Enter the OTP sent to your email.
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">OTP</label>
              <input
                type="text"
                placeholder="Enter OTP"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                style={{ borderColor: colors.border, backgroundColor: "white" }}
              />
              {errors.otp && (
                <p className="text-red-600 text-sm mt-1 font-medium">
                  {errors.otp}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full font-semibold py-2 rounded-lg transition-all duration-300 active:bg-[#ff9f68]"
              style={{
                backgroundColor: colors.primary,
                color: "white",
              }}
            >
              Verify OTP
            </button>
          </form>
        )}

        {/* Step 3 - Password Change */}
        {step === 3 && !success && (
          <form onSubmit={handlePassword}>
            <p className="text-center mb-6 text-sm text-gray-600">
              Set your new password
            </p>

            <div className="relative mb-5">
              <label className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => checkStrength(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg pr-10 focus:outline-none"
                style={{
                  borderColor: errors.password ? "red" : colors.border,
                  backgroundColor: "white",
                }}
              />
              <button
                type="button"
                onClick={togglePassword}
                className="cursor-pointer absolute right-4 top-10 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1 font-medium">
                  {errors.password}
                </p>
              )}
              {strength && !errors.password && (
                <p className="text-sm mt-1 font-medium text-gray-700">
                  {strength}
                </p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                style={{
                  borderColor: errors.confirmPassword ? "red" : colors.border,
                  backgroundColor: "white",
                }}
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1 font-medium">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full font-semibold py-2 rounded-lg transition-all duration-200 bg- hover:bg-[#e85d2b] active:bg-[#ff9f68]"
              style={{
                backgroundColor: colors.primary,
                color: "white",
              }}
            >
              Reset Password
            </button>
          </form>
        )}

        {/* Back link */}
        {!success && (
          <div className="mt-6 text-center">
            <Link
              to="/signin"
              className="text-sm font-medium hover:underline"
              style={{ color: colors.primary }}
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forgot;
