import React, { useState, useEffect } from "react";
import { ArrowLeft, Utensils, Plus, Trash2, Loader2, Image as ImageIcon, IndianRupee, Clock, ChevronRight, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setMyShopItems, setMyShopData } from "../redux/ownerSlice";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { cn } from "../utility/cn";

const categories = [
        "Starters",
        "Main Course",
        "Desserts",
        "Pizza",
        "Burger",
        "Sandwiches",
        "North Indian",
        "South Indian",
        "Chinese",
        "Street Food",
        "Beverages",
        "Others"  
];

const EditItem = () => {
  const { itemId } = useParams();
  const { request, loading } = useApi();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Form states
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [foodType, setFoodType] = useState("veg");
  const [category, setCategory] = useState("Others");
  const [price, setPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState("");
  const [prepTime, setPrepTime] = useState(10);
  
  // Dynamic lists
  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);

  const [image, setImage] = useState(null); // New image File
  const [previewImage, setPreviewImage] = useState(""); // Existing or preview URL

  // Fetch item data on mount and set form state
  useEffect(() => {
    const fetchItemData = async () => {
      const { data } = await request(
        { url: `/api/item/get-item/${itemId}`, method: "get" },
        { showToast: false }
      );

      if (data?.item) {
          const item = data.item;
          setItemName(item.name || "");
          setDescription(item.description || "");
          setFoodType(item.foodType || "veg");
          setCategory(item.category || "Others");
          setPrice(item.price || 0);
          setDiscountPrice(item.discountPrice || "");
          setPrepTime(item.prepTime || 10);
          
          // Variants and Addons are arrays in backend
          setVariants(item.variants || []);
          setAddons(item.addons || []);

          setImage(null);
          setPreviewImage(item.image || "");
      } else {
        navigate(-1);
      }
    };

    fetchItemData();
  }, [itemId, navigate, request]);

  // Handle image file change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setImage(file);
        setPreviewImage(URL.createObjectURL(file));
    }
  };

  // Variant Handlers
  const addVariant = () => {
      setVariants([...variants, { name: "", price: "" }]);
  };

  const removeVariant = (index) => {
      const newVariants = variants.filter((_, i) => i !== index);
      setVariants(newVariants);
  };

  const handleVariantChange = (index, field, value) => {
      const newVariants = [...variants];
      newVariants[index][field] = value;
      setVariants(newVariants);
  };

  // Addon Handlers
  const addAddon = () => {
      setAddons([...addons, { title: "", price: "" }]);
  };

  const removeAddon = (index) => {
      const newAddons = addons.filter((_, i) => i !== index);
      setAddons(newAddons);
  };

  const handleAddonChange = (index, field, value) => {
      const newAddons = [...addons];
      newAddons[index][field] = value;
      setAddons(newAddons);
  };

  // Handle form submit to update item
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ADDED: Validate discount price is not greater than actual price
    if (discountPrice && Number(discountPrice) > Number(price)) {
      toast.error("Discount price cannot be greater than actual price");
      return;
    }

    const formData = new FormData();
    formData.append("name", itemName);
    formData.append("description", description);
    formData.append("foodType", foodType);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("discountPrice", discountPrice);
    formData.append("prepTime", prepTime);
    
    // Append JSON strings for complex arrays
    formData.append("variants", JSON.stringify(variants));
    formData.append("addons", JSON.stringify(addons));

    if (image) {
      formData.append("image", image);
    }

    await request(
      {
        url: `/api/item/edit-item/${itemId}`,
        method: "put",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" }
      },
      {
        loadingMessage: "Updating item details...",
        successMessage: "Item updated successfully!",
        onSuccess: (data) => {
          if (data.shop) {
              dispatch(setMyShopData(data.shop));
              if (data.shop.items) {
                 dispatch(setMyShopItems(data.shop.items));
              }
          }
          navigate("/");
        }
      }
    );
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-white min-h-screen relative">
      {/* Back Button */}
      <div className="absolute top-6 left-6 text-3xl text-orange-500 drop-shadow-md cursor-pointer z-10">
        <ArrowLeft size={38} onClick={() => navigate(-1)} className="border bg-white p-1 rounded-2xl shadow hover:text-[#ff4d2d] transition"/>
      </div>

      {/* Container */}
      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-md shadow-xl rounded-3xl p-10 border border-orange-200 hover:shadow-2xl transition-all ">
        {/* Heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-100 p-4 rounded-full shadow-inner">
            <Utensils className="text-[#ff4d2d] w-12 h-12" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-4">Edit Item</h1>
          <p className="text-gray-500 text-sm mt-2">
            Update the details of your food item to keep your menu fresh.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded-lg bg-white shadow-sm focus:outline-[#ff4d2d] placeholder:text-gray-400"
                  placeholder="Enter item name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border px-3 py-2 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map((cat, i) => (
                    <option key={i} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Type</label>
                   <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="foodType" 
                                value="veg"
                                checked={foodType === "veg"}
                                onChange={(e) => setFoodType(e.target.value)}
                                className="accent-green-600"
                            />
                            <span className="text-green-700 font-medium">Veg</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="foodType" 
                                value="non-veg"
                                checked={foodType === "non-veg"}
                                onChange={(e) => setFoodType(e.target.value)}
                                className="accent-red-600"
                            />
                            <span className="text-red-700 font-medium">Non-Veg</span>
                        </label>
                     </div>
              </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (mins)</label>
                  <input
                      type="number"
                      className="w-full border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                      placeholder="10"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      min="0"
                  />
              </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  className="w-full border px-3 py-2 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
                  placeholder="Enter price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (₹) <span className="text-gray-400 text-xs">(Optional)</span></label>
                  <input
                      type="number"
                      className="w-full border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                      placeholder="0"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      min="0"
                  />
              </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border px-3 py-2 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
              placeholder="Write something about this item..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Food Image</label>
            <div className="flex items-start gap-4">
              <label className="cursor-pointer px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition text-[#ff4d2d] text-sm font-medium">
                Change Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {previewImage && (
                <img
                  src={previewImage}
                  alt="preview"
                  className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                />
              )}
            </div>
          </div>

          {/* Variants Section */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Variants (Optional)</h3>
              <button
                type="button"
                onClick={addVariant}
                className="text-[#ff4d2d] text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add Variant
              </button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="flex gap-4 items-center mb-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Size (e.g. Small)"
                  className="flex-1 border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                  value={variant.name}
                  onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="w-24 border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                  value={variant.price}
                  onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Add-ons Section */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Add-ons (Optional)</h3>
              <button
                type="button"
                onClick={addAddon}
                className="text-[#ff4d2d] text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add Add-on
              </button>
            </div>

            {addons.map((addon, index) => (
              <div key={index} className="flex gap-4 items-center mb-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Extra Cheese"
                  className="flex-1 border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                  value={addon.title}
                  onChange={(e) => handleAddonChange(index, "title", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="w-24 border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                  value={addon.price}
                  onChange={(e) => handleAddonChange(index, "price", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeAddon(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
                "w-full bg-[#ff4d2d] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#e84224] transition transform active:scale-95 flex items-center justify-center gap-2 mt-6",
                loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {loading ? "Updating Item..." : "Update Food Item"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditItem;
