import React, { useState } from "react";
import axios from "axios";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FaUtensils, FaPlus, FaTrash } from "react-icons/fa6";
import { serverURL } from "../App";
import { setMyShopItems, setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners";

const AddNewItem = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    // Categories matching backend
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

    // Form states
    const [itemName, setItemName] = useState("");
    const [description, setDescription] = useState("");
    const [foodType, setFoodType] = useState("veg");
    const [category, setCategory] = useState("Others");
    const [price, setPrice] = useState("");
    const [discountPrice, setDiscountPrice] = useState("");
    const [prepTime, setPrepTime] = useState(10);
    
    // Dynamic lists
    const [variants, setVariants] = useState([]);
    const [addons, setAddons] = useState([]);

    const [image, setImage] = useState(null);
    const [previewImage, setPreviewImage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleImage = (e) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();

            formData.append("name", itemName);
            if (image) {
                formData.append("image", image);
            }
            formData.append("price", price);
            formData.append("discountPrice", discountPrice);
            formData.append("description", description);
            formData.append("category", category);
            formData.append("foodType", foodType);
            formData.append("prepTime", prepTime);
            // formData.append("isAvailable", isAvailable); // Backend default is true, usually not needed on create unless false

            // Append JSON strings for complex arrays
            formData.append("variants", JSON.stringify(variants));
            formData.append("addons", JSON.stringify(addons));

            const response = await axios.post(`${serverURL}/api/item/add-item`, formData, { withCredentials: true });

            if(response.data.shop) dispatch(setMyShopData(response.data.shop));
            // Assuming the backend returns the updated item list or we need to refetch?
            // The controller returns: { success: true, message: "...", shop } 
            // And shop is populated with items.
            if(response.data.shop && response.data.shop.items) {
                dispatch(setMyShopItems(response.data.shop.items));
            }
            
            console.log("FORM SUBMITTED:", response.data);
            setLoading(false);
            navigate("/");

        } catch (error) {
            console.log("AXIOS ERROR RAW =>", error);
            console.log("FORM DATA ERROR =>", error?.response?.data?.error);
            console.log("MESSAGE =>", error?.response?.data?.message);
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-white min-h-screen relative">

            {/* Back Button */}
            <div className="absolute top-6 left-6 text-3xl text-orange-500 drop-shadow-md z-10">
                <IoIosArrowRoundBack
                    size={38}
                    className="border bg-white p-1 rounded-2xl shadow hover:text-[#ff4d2d] cursor-pointer transition"
                    onClick={() => navigate("/")}
                />
            </div>

            {/* Container */}
            <div className="max-w-3xl w-full bg-white/90 backdrop-blur-md shadow-xl rounded-3xl p-10 border border-orange-200 transition-all">

                {/* Heading */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-orange-100 p-4 rounded-full shadow-inner">
                        <FaUtensils className="text-[#ff4d2d] w-12 h-12" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 mt-4">
                        Create New Item
                    </div>
                    <p className="text-gray-500 text-sm">
                        Add delicious food items to attract customers
                    </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                            <input
                                type="text"
                                className="w-full border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                                placeholder="e.g. Butter Chicken"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                required
                            />
                        </div>
                        
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                className="w-full border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
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
                                className="w-full border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                                placeholder="0"
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
                            className="w-full border px-3 py-2 rounded-lg focus:outline-[#ff4d2d]"
                            placeholder="Describe the item..."
                            rows="3"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Image</label>
                        <div className="flex items-start gap-4">
                            <label className="cursor-pointer px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 text-[#ff4d2d] transition text-sm font-medium">
                                Upload Image
                                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                            </label>
                            {previewImage && (
                                <img src={previewImage} alt="preview" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
                            )}
                        </div>
                    </div>

                    {/* Variants Section */}
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Variants <span className="font-normal text-gray-500">(e.g. Small, Large)</span></label>
                            <button type="button" onClick={addVariant} className="text-xs flex items-center gap-1 text-[#ff4d2d] hover:underline font-semibold">
                                <FaPlus /> Add Variant
                            </button>
                        </div>
                        
                        {variants.map((variant, index) => (
                            <div key={index} className="flex gap-3 mb-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Variant Name"
                                    className="flex-1 border px-3 py-2 rounded-lg text-sm focus:outline-[#ff4d2d]"
                                    value={variant.name}
                                    onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-24 border px-3 py-2 rounded-lg text-sm focus:outline-[#ff4d2d]"
                                    value={variant.price}
                                    onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                                />
                                <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700">
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Addons Section */}
                    <div className="border-t pt-4">
                         <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Add-ons <span className="font-normal text-gray-500">(e.g. Extra Cheese)</span></label>
                            <button type="button" onClick={addAddon} className="text-xs flex items-center gap-1 text-[#ff4d2d] hover:underline font-semibold">
                                <FaPlus /> Add Add-on
                            </button>
                        </div>
                        
                        {addons.map((addon, index) => (
                            <div key={index} className="flex gap-3 mb-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Addon Title"
                                    className="flex-1 border px-3 py-2 rounded-lg text-sm focus:outline-[#ff4d2d]"
                                    value={addon.title}
                                    onChange={(e) => handleAddonChange(index, "title", e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-24 border px-3 py-2 rounded-lg text-sm focus:outline-[#ff4d2d]"
                                    value={addon.price}
                                    onChange={(e) => handleAddonChange(index, "price", e.target.value)}
                                />
                                <button type="button" onClick={() => removeAddon(index)} className="text-red-500 hover:text-red-700">
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full py-3 bg-[#ff4d2d] text-white font-bold rounded-lg hover:bg-orange-600 transition duration-300 shadow-md mt-6"
                        disabled={loading}
                    >
                        {loading ? <ClipLoader size={20} color="white" /> : "Create Item"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddNewItem;
