import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { serverURL } from "../../App";
import { useDispatch } from "react-redux";
import { setUserData } from "../../redux/userSlice";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const colors = {
    primary: "#ff6b35",
    hover: "#e85d2b",
    focusGlow: "rgba(255, 107, 53, 0.4)",
    border: "#ff9f68",
    bg: "#fff3e9",
    cardBg: "rgba(255, 255, 255, 0.85)",
    textDark: "#3b2f2f",
  };

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    //   setLoading((prev)=>!prev);
    //   setTimeout(() => {
    //     setLoading((prev)=>!prev);
    //   }, 1000);
    // };
  }

  const validate = () => {
    let newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.password.trim())
      newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Minimum 6 characters required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return setErrors(errors);

    setLoading(true);

    try {
    const res = await axios.post(
      `${serverURL}/api/auth/signin`,
      formData,
      { withCredentials: true }
    );
    
    console.log(res.data.message);

    //dispatch imp redux toolkit things 4:55:48
    dispatch(setUserData(res.data));
    
    navigate("/");  // Correct usage here

  } catch (error) {
    // Handle error here (optional)
    console.error("Signin error:", error);
  } finally {
    setLoading(false);
  }
  };



  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.bg}, #ffe0c7)`,
      }}
    >
      {/* Loading Transition Overlay */}
      <div
        className="loading-screen absolute top-0 left-0 w-full h-full bg-[#ff6b35] flex items-center justify-center text-white text-2xl font-bold z-50"
        style={{ transform: "translateY(100%)" }}
      >
        Zaika Box
      </div>

      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          boxShadow: `0 10px 25px rgba(255, 107, 53, 0.25)`,
        }}
      >
        <h1
          className="text-4xl font-extrabold text-center mb-2 tracking-wide"
          style={{ color: colors.primary }}
        >
          Zaika Box
        </h1>
        <p className="text-center text-gray-700 mb-8">
          Welcome back foodie! <br /> Log in to continue your cravings 🍟
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 font-medium mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none transition-all duration-200"
              style={{
                borderColor: errors.email ? "red" : colors.border,
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = `0 0 0 3px ${colors.focusGlow}`)
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <label
              htmlFor="password"
              className="block text-gray-700 font-medium mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none transition-all duration-200"
              style={{
                borderColor: errors.password ? "red" : colors.border,
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = `0 0 0 3px ${colors.focusGlow}`)
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="cursor-pointer absolute right-4 top-10 text-gray-500 hover:text-gray-700 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && (
              <p className="text-red-600 text-sm mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm font-semibold cursor-pointer"
              onClick={() => navigate("/forgotpassword")}
              style={{ color: colors.primary }}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`cursor-pointer w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] ${loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            style={{
              backgroundColor: colors.primary,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <hr className="grow border-t border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">or</span>
          <hr className="grow border-t border-gray-300" />
        </div>

        {/* Social login */}
        <div className="flex justify-center gap-4">
          <button className=" cursor-pointer flex items-center gap-2 border rounded-lg px-4 py-2 hover:scale-105 transition-all duration-200 shadow-sm bg-white active:bg-gray-300"
          // onClick={handleGoogleAuth}
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span className="text-gray-700 text-sm font-semibold">Google</span>
          </button>
          {/* <button className="flex items-center gap-2 border rounded-lg px-4 py-2 hover:scale-105 transition-all duration-200 shadow-sm bg-white active:bg-gray-300">
            <img
              src="https://www.svgrepo.com/show/475647/facebook-color.svg"
              alt="Facebook"
              className="w-5 h-5"
            />
            <span className="text-gray-700 text-sm font-semibold">
              Facebook
            </span>
          </button> */}
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-gray-700 text-sm">
          Don’t have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold hover:underline"
            style={{ color: colors.primary }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
