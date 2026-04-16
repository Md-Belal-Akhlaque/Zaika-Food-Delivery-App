import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Camera, User, Phone, Mail, ChevronLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { setUserData } from "../redux/userSlice";
import Navbar from "../components/Navbar";
import { toast } from "sonner";
import { cn } from "../utility/cn";

/**
 * Profile Page
 * UTILIZES: profileImage, profileImagePublicId, fullName, mobile, email
 */
const Profile = () => {
  const { userData } = useSelector((state) => state.user);
  const { request, loading } = useApi();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [mobile, setMobile] = useState(userData?.mobile || "");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(userData?.profileImage || null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("mobile", mobile);
    if (imageFile) {
      formData.append("profileImage", imageFile);
    }

    await request(
      {
        url: "/api/user/update-profile",
        method: "patch",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" }
      },
      {
        loadingMessage: "Updating profile...",
        successMessage: "Profile updated successfully!",
        onSuccess: (data) => {
          dispatch(setUserData({ ...userData, ...data.user }));
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Navbar />
      
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 mb-6 hover:text-[#ff4d2d] transition group font-semibold"
        >
          <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" /> 
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-50">
          <div className="bg-gradient-to-r from-[#ff4d2d] to-orange-500 h-32 relative">
            <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-full shadow-lg border-4 border-white">
              <div className="relative group">
                <img 
                  src={imagePreview || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition">
                  <Camera className="text-white" size={24} />
                  <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-16 p-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">{userData?.fullName}</h1>
                    <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mt-1">{userData?.role} Account</p>
                </div>
                <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Verified Member
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff4d2d] transition-colors" size={20} />
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-[#ff4d2d] outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Mobile Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff4d2d] transition-colors" size={20} />
                    <input 
                      type="text" 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Your mobile number"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-[#ff4d2d] outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="email" 
                      value={userData?.email}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl text-gray-500 cursor-not-allowed font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 ml-1">Email address cannot be changed for security reasons.</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-50">
                <button 
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-8 py-3.5 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3.5 rounded-2xl bg-[#ff4d2d] text-white font-black shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
