import { useState } from "react";
import axios from "axios";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaUtensils } from "react-icons/fa6";
import { serverURL } from "../App";
import { setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners";
import Map from "../components/Map"; // Import Map component

const CreateEditShop = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { myShopData } = useSelector((state) => state.owner);
  const { currentCity, currentState, currentAddress } = useSelector((state) => state.user);
  const { location: mapLocation } = useSelector((state) => state.map); // Get location from map slice

  // form states
  const [shopName, setShopName] = useState(myShopData?.shop?.name || "");
  const [City, setCity] = useState(myShopData?.shop?.city || currentCity || "");
  const [State, setState] = useState(myShopData?.shop?.state || currentState || "");
  const [Address, setAddress] = useState(myShopData?.shop?.address || currentAddress || "");
  const [category, setCategory] = useState(myShopData?.shop?.shopType?.[0] || "Restaurant"); // Default to first category
  const [description, setDescription] = useState(myShopData?.shop?.description || "");
  const [prepTime, setPrepTime] = useState(myShopData?.shop?.prepTime || 15);
  const [deliveryTime, setDeliveryTime] = useState(myShopData?.shop?.deliveryTime || 30);
  
  const [image, setImage] = useState(null); // Changed default to null for file
  const [previewImage, setPreviewImage] = useState(myShopData?.shop?.image || "");
  const [loading, setLoading] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreviewImage(URL.createObjectURL(file)); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", shopName);
      if (image) {
        formData.append("image", image);
      }
      formData.append("city", City);
      formData.append("state", State);
      formData.append("address", Address);
      formData.append("shopType", JSON.stringify([category])); // Send as array
      formData.append("description", description);
      formData.append("prepTime", prepTime);
      formData.append("deliveryTime", deliveryTime);
      
      if (mapLocation?.lat && mapLocation?.lon) {
        formData.append("latitude", mapLocation.lat);
        formData.append("longitude", mapLocation.lon);
      } else if (myShopData?.shop?.latitude && myShopData?.shop?.longitude) {
         formData.append("latitude", myShopData.shop.latitude);
         formData.append("longitude", myShopData.shop.longitude);
      }

      let response;
      if (myShopData?.shop?._id) {
         // Update existing shop
         response = await axios.put(`${serverURL}/api/shop/${myShopData.shop._id}`, formData, { withCredentials: true });
      } else {
         // Create new shop
         response = await axios.post(`${serverURL}/api/shop/`, formData, { withCredentials: true });
      }

      dispatch(setMyShopData(response.data));
      console.log("FORM SUBMITTED:", response.data);

      navigate("/");
      setLoading(false);
      
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
      <div className="absolute top-6 left-6 text-3xl text-orange-400 z-10">
        <IoIosArrowRoundBack
          size={35}
          className="border rounded-2xl hover:text-[#ff4d2d] cursor-pointer"
          onClick={() => navigate(-2)}
        />
      </div>

      {/* container */}
      <div className="max-w-xl w-full bg-white shadow-xl rounded-2xl p-8 border border-orange-100">

        {/* Heading */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-orange-100 p-4 rounded-full mb-4">
            <FaUtensils className="text-[#ff4d2d] w-16 h-16" />
          </div>

          <div className="text-3xl font-extrabold text-gray-900">
            {myShopData ? "Edit Shop" : "Create Shop"}
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>

          {/* Shop Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Name
            </label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
              placeholder="Enter your shop name"
              value={myShopData?.name || shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="w-full border px-3 py-2 rounded-lg"
            />

            {/* Preview */}
            {previewImage && (
              <img
                src={previewImage}
                alt="preview"
                className="w-full h-50 object-cover rounded-lg mt-3 border"
              />
            )}
          </div>


          {/* city, state */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
                placeholder="Shop City"
                value={City}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
                placeholder="Shop State"
                value={State}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
          </div>

          {/* address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400 mb-4"
              placeholder="Shop Address"
              value={Address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* Map for Location */}
          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-1">
              Pin Location on Map
            </label>
            <div className="h-64 w-full border rounded-lg overflow-hidden">
                <Map />
            </div>
          </div>


          {/* Category */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Restaurant</option>
              <option>Cafe</option>
              <option>Fast Food</option>
              <option>Snacks & Tea</option>
              <option>North Indian</option>
              <option>South Indian</option>
              <option>Chinese</option>
              <option>Bakery</option>
            </select>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
              placeholder="Tell us about your shop..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
          </div>

          {/* Prep Time & Delivery Time */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prep Time (mins)
              </label>
              <input
                type="number"
                className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                min="0"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Time (mins)
              </label>
              <input
                type="number"
                className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-[#ff4d2d] text-white font-semibold rounded-lg hover:bg-orange-600 transition duration-300"
          >

            {loading ? <ClipLoader size={25} color="white" /> : (myShopData ? "Update Shop" : "Create Shop")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEditShop;
