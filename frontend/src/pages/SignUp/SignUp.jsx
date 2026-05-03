import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { setUserData } from "../../redux/userSlice";
import { useApi } from "../../hooks/useApi";

const roleOptions = [
  { key: "user", label: "User", icon: "👤" },
  { key: "owner", label: "Owner", icon: "🧑‍🍳" },
  { key: "deliveryPartner", label: "Delivery Partner", icon: "🚚" },
];

const SignUp = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { request, loading } = useApi();
  // Color theme
  const colors = {
    primary: "#ff6b35",
    hover: "#e85d2b",
    focusGlow: "rgba(255, 107, 53, 0.4)",
    border: "#ff9f68",
    bg: "#fff3e9",
    cardBg: "#fffaf6",
    textDark: "#3b2f2f",
  };

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    role: "user",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleRoleSelect = (key) =>
    setFormData((prev) => ({ ...prev, role: key }));

  const togglePassword = () => setShowPassword((prev) => !prev);

  // Validation logic
  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.mobile.trim()) newErrors.mobile = "Phone is required";
    else if (formData.mobile.length !== 10)
      newErrors.mobile = "Phone must be 10 digits";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    await request(
      {
        url: "/api/auth/signup",
        method: "post",
        data: formData,
      },
      {
        loadingMessage: "Creating your account...",
        successMessage: "Account created successfully! Please sign in.",
        onSuccess: (data) => {
          // Add this line
          if (data.token) localStorage.setItem("token", data.token);
          dispatch(setUserData(data.user));
          setErrors({});
          navigate("/signin");
        },
        onError: (err) => {
          const status = err?.response?.status;
          const backendMessage = err?.response?.data?.message;
          if (status === 429) {
            setErrors((prev) => ({
              ...prev,
              global: "Too many signup attempts. Please wait a minute and try again.",
            }));
            return;
          }

          setErrors((prev) => ({
            ...prev,
            global: backendMessage || "Unable to register right now. Please try again.",
          }));
        },
      }
    );
  };


  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: colors.bg }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl border backdrop-blur-md"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          boxShadow: `0 8px 20px rgba(255, 107, 53, 0.2)`,
        }}
      >
        <h1
          className="text-4xl font-extrabold text-center mb-2 tracking-wide"
          style={{ color: colors.primary }}
        >
          Zaika
        </h1>
        <p className="text-center mb-8 text-gray-700">
          Your gateway to delicious food & happy moments
        </p>

        {/* FORM */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-1" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none transition-all duration-200 ${errors.fullName ? "border-red-500" : ""
                }`}
              style={{
                borderColor: errors.fullName ? "red" : colors.border,
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = `0 0 0 3px ${colors.focusGlow}`)
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            {errors.fullName && (
              <p className="text-red-600 text-sm mt-1 font-medium">
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1"
              htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none transition-all duration-200 ${errors.email ? "border-red-500" : ""
                }`}
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
            <label className="block text-gray-700 font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none transition-all duration-200 ${errors.password ? "border-red-500" : ""
                }`}
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
              onClick={togglePassword}
              className="absolute cursor-pointer right-4 top-10 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && (
              <p className="text-red-600 text-sm mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-gray-700 font-medium mb-1" htmlFor="mobile">
              Phone
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              value={formData.mobile}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none transition-all duration-200 ${errors.mobile ? "border-red-500" : ""
                }`}
              style={{
                borderColor: errors.mobile ? "red" : colors.border,
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = `0 0 0 3px ${colors.focusGlow}`)
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            {errors.mobile && (
              <p className="text-red-600 text-sm mt-1 font-medium">
                {errors.mobile}
              </p>
            )}
          </div>

          {/* Role selection */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="role">
              Select Role
            </label>
            <div className="flex gap-4 justify-evenly" id="role">
              {roleOptions.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(key)}
                  className={`cursor-pointer flex flex-col items-center justify-center rounded-xl border px-4 py-3 w-24 shadow-sm transition-all duration-200 hover:scale-105 ${formData.role === key ? "ring-2 ring-offset-2" : "opacity-85 hover:opacity-100"
                    }`}
                  style={{
                    borderColor: formData.role === key ? colors.primary : colors.border,
                    color: formData.role === key ? colors.primary : "inherit",
                    backgroundColor: formData.role === key ? `${colors.bg}` : "white",
                  }}
                >
                  <span className="text-3xl">{icon}</span>
                  <span className="mt-1 font-semibold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error from backend/global */}
          {errors.global && (
            <p className="text-red-600 text-sm font-semibold text-center">{errors.global}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center gap-2 cursor-pointer w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) =>
              !loading && (e.target.style.backgroundColor = colors.hover)
            }
            onMouseLeave={(e) =>
              !loading && (e.target.style.backgroundColor = colors.primary)
            }
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Registering...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-700 text-sm">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="cursor-pointer font-semibold hover:underline"
            style={{ color: colors.primary }}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
