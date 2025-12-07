import React, { useState } from "react";
import axios from "axios";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaUtensils } from "react-icons/fa6";
import { serverURL } from "../App";
import { setMyShopItems,setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners";



const AddNewItem = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { myShopItem } = useSelector((state) => state.owner);
    // const { myShopData } = useSelector((state) => state.owner);

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
        "Others"];


    // form states
    //yaha par .shop isiliye kara hai becoz backend se data ownerSlice me success and shop json me aya hai to ownerslice me shop me name ko access kar rahe hai 
    const [itemName, setItemName] = useState(myShopItem?.name || "");
    const [description, setDescription] = useState(myShopItem?.description || "");
    const [foodType, setFoodType] = useState("veg");
    const [category, setCategory] = useState(myShopItem?.category || "Restaurant");
    const [price, setPrice] = useState(myShopItem?.price || "");
    const [image, setImage] = useState(myShopItem?.image || "");
    const [previewImage, setPreviewImage] = useState(myShopItem?.image || "");
    const [loading, setLoading] = useState(false);

    const handleImage = (e) => {
        const file = e.target.files[0];
        setImage(file);
        setPreviewImage(URL.createObjectURL(file)); //frontend img ka url ban gaya hai 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            //ye ek class hoti hai 
            const formData = new FormData();

            formData.append("name", itemName)
            if (image) {
                formData.append("image", image)
            }
            formData.append("price", price)
            formData.append("description", description)
            formData.append("category", category)
            formData.append("foodType", foodType)

              const response = await axios.post(`${serverURL}/api/item/add-item`,formData,{withCredentials:true});

            
              dispatch(setMyShopData(response.data.shop));
              dispatch(setMyShopItems(response.data.item));
              console.log("FORM SUBMITTED:", response.data);
              setLoading(false);
              navigate("/");

        } catch (error) {
            console.log("AXIOS ERROR RAW =>", error);
            console.log("FORM DATA ERROR =>", error?.response?.data?.error);  //ye specific error show karta hai 
            console.log("MESSAGE =>", error?.response?.data?.message);
            setLoading(false);
        }
    };




    return (
        <div className="flex justify-center flex-col items-center p-6 bg-gradient-to-br 
                  from-orange-50 to-white min-h-screen relative">

            {/* Back Button */}
            <div className="absolute top-6 left-6 text-3xl text-orange-500 drop-shadow-md">
                <IoIosArrowRoundBack
                    size={38}
                    className="border bg-white p-1 rounded-2xl shadow hover:text-[#ff4d2d] 
                   cursor-pointer transition"
                    onClick={() => navigate("/")}
                />
            </div>

            {/* Container */}
            <div className="max-w-xl w-full bg-white/90 backdrop-blur-md shadow-xl rounded-3xl 
                    p-10 border border-orange-200 hover:shadow-2xl transition-all">

                {/* Heading */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-orange-100 p-4 rounded-full shadow-inner">
                        <FaUtensils className="text-[#ff4d2d] w-16 h-16" />
                    </div>

                    <div className="text-3xl font-extrabold text-gray-900 mt-4">
                        {myShopItem ? "Edit Item" : "Create New Item"}
                    </div>

                    <p className="text-gray-500 text-sm">
                        Add delicious food items to attract customers 
                    </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit}>

                    {/* Name */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                        </label>
                        <input
                            type="text"
                            className="w-full border px-3 py-3 rounded-lg bg-white shadow-sm
                       focus:outline-[#ff4d2d] placeholder:text-gray-400"
                            placeholder="Enter item name"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Image */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Food Image
                        </label>

                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer px-4 py-2 bg-orange-100 border 
                               border-orange-300 rounded-lg shadow hover:bg-orange-200 
                               transition text-[#ff4d2d] font-medium">
                                Choose Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImage}
                                    className="hidden"
                                />
                            </label>

                            <span className="text-gray-500 text-sm">
                                {image?.name || "No file chosen"}
                            </span>
                        </div>

                        {/* Preview */}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (₹)
                        </label>
                        <input
                            type="number"
                            className="w-full border px-3 py-3 rounded-lg shadow-sm 
                       focus:outline-[#ff4d2d]"
                            placeholder="Enter price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            className="w-full border px-3 py-3 rounded-lg shadow-sm 
                       focus:outline-[#ff4d2d]"
                            placeholder="Write something about this item..."
                            rows="3"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>

                    {/* category */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            className="w-full border px-3 py-3 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat, index) => (
                                <option key={index} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Food Type */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Food Type
                        </label>
                        <select
                            className="w-full border px-3 py-3 rounded-lg shadow-sm focus:outline-[#ff4d2d]"
                            value={foodType}
                            onChange={(e) => setFoodType(e.target.value)}
                        >
                            <option>Veg</option>
                            <option>Non-Veg</option>
                        </select>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full py-3 bg-[#ff4d2d] text-white font-semibold rounded-xl 
                     shadow-md hover:bg-[#e84224] hover:shadow-lg transition-all duration-300"
                    >
                        {loading?<ClipLoader size={25} color="white"/>:(myShopItem ? "Update Item" : "Create Item")}
                    </button>
                </form>
            </div>
        </div>
    );

};

export default AddNewItem;
