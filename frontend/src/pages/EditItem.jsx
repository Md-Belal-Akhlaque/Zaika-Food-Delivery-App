import React, { useState, useEffect } from "react";
import axios from "axios";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FaUtensils } from "react-icons/fa6";
import { serverURL } from "../App";
import { setMyShopItems, setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners";

const categories = [
  "Snacks",
  "Main Course",
  "Desserts",
  "Pizza",
  "Burger",
  "Sandwitches",
  "South Indian",
  "North Indian",
  "Chinese",
  "Fast Food",
  "Others",
];

const EditItem = () => {
  const { itemId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Form states with sensible defaults
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [foodType, setFoodType] = useState("Veg");
  const [category, setCategory] = useState("Others");
  const [price, setPrice] = useState(0);
  const [image, setImage] = useState(null); // New image File
  const [previewImage, setPreviewImage] = useState(""); // Existing or preview URL
  const [loading, setLoading] = useState(false);
  // Fetch item data on mount and set form state
  useEffect(() => {
    const fetchItemData = async () => {
      try {
        const response = await axios.get(`${serverURL}/api/item/get-item/${itemId}`, {
          withCredentials: true,
        });
        const data = response.data;

        setItemName(data.name || "");
        setDescription(data.description || "");
        setFoodType(data.foodType || "Veg");
        setCategory(data.category || "Others");
        setPrice(data.price || 0);
        setImage(null);
        setPreviewImage(data.image || "");
      } catch (error) {
        console.error("Failed to fetch item data", error);
        alert("Failed to load item data.");
        navigate(-1); // Go back if failed
      }
    };

    fetchItemData();
  }, [itemId, navigate]);

  // Handle image file change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  // Handle form submit to update item
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", itemName);
      formData.append("description", description);
      formData.append("foodType", foodType);
      formData.append("category", category);
      formData.append("price", price);
      if (image) {
        formData.append("image", image);
      }

      const response = await axios.put(
        `${serverURL}/api/item/edit-item/${itemId}`,
        formData,
        { withCredentials: true }
      );

      // Assuming response contains updated shop and items:
      dispatch(setMyShopData(response.data.shop));
      dispatch(setMyShopItems(response.data.shop.items || []));

      alert("Item updated successfully.");
      navigate("/"); // Or wherever you want to navigate after update
      setLoading(false);
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("Failed to update item.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-white min-h-screen relative">
      {/* Back Button */}
      <div className="absolute top-6 left-6 text-3xl text-orange-500 drop-shadow-md cursor-pointer">
        <IoIosArrowRoundBack size={38} onClick={() => navigate(-1)} />
      </div>

      {/* Container */}
      <div className="max-w-xl w-full bg-white/90 backdrop-blur-md shadow-xl rounded-3xl p-10 border border-orange-200 hover:shadow-2xl transition-all " disabled={loading}>
        {/* Heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-100 p-4 rounded-full shadow-inner">
            <FaUtensils className="text-[#ff4d2d] w-16 h-16" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-4">Edit Item</h1>
          <p className="text-gray-500 text-sm mt-2">
            Update the details of your food item to keep your menu fresh.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Item Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              className="w-full border px-3 py-3 rounded-lg bg-white shadow-sm focus:outline-[#ff4d2d] placeholder:text-gray-400"
              placeholder="Enter item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          {/* Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Food Image</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer px-4 py-2 bg-orange-100 border border-orange-300 rounded-lg shadow hover:bg-orange-200 transition text-[#ff4d2d] font-medium">
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <span className="text-gray-500 text-sm">{image?.name || "No file chosen"}</span>
            </div>
            {previewImage && (
              <img
                src={previewImage}
                alt="preview"
                className="w-full h-52 object-cover rounded-xl mt-4 shadow-md border"
              />
            )}
          </div>

          {/* Price */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
            <input
              type="number"
              className="w-full border px-3 py-3 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border px-3 py-3 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
              placeholder="Write something about this item..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full border px-3 py-3 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Food Type */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Type</label>
            <select
              className="w-full border px-3 py-3 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
              value={foodType}
              onChange={(e) => setFoodType(e.target.value)}
              required
            >
              <option value="Veg">Veg</option>
              <option value="Non-Veg">Non-Veg</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-[#ff4d2d] text-white font-semibold rounded-xl shadow-md hover:bg-[#e84224] transition-all duration-300" disabled={loading}
          >{loading ? <ClipLoader size={28} color='white'/> : "Save"}
           
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditItem;
