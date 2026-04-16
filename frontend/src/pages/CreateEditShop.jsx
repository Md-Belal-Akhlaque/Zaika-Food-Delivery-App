import { useState, useEffect } from "react";
import { ArrowLeft, Utensils, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { setMyShopData } from "../redux/ownerSlice";
import Map from "../components/Map"; // Import Map component
import { useApi } from "../hooks/useApi";

const CreateEditShop = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { request, loading } = useApi();

  const { myShopData } = useSelector((state) => state.owner);
  const { currentCity, currentState, currentAddress } = useSelector((state) => state.user);
  const { location: mapLocation } = useSelector((state) => state.map); // Get location from map slice

  // form states
  const [shopName, setShopName] = useState("");
  const [City, setCity] = useState(currentCity || "");
  const [State, setState] = useState(currentState || "");
  const [Address, setAddress] = useState(currentAddress || "");
  const [category, setCategory] = useState("Restaurant");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState(15);
  const [deliveryTime, setDeliveryTime] = useState(30);
  
  const [image, setImage] = useState(null); // Changed default to null for file
  const [previewImage, setPreviewImage] = useState("");

  // FIXED: Use controlled component pattern - Initialize form values from myShopData
  useEffect(() => {
    if (myShopData?.shop) {
      setShopName(myShopData.shop.name || "");
      setCity(myShopData.shop.city || currentCity || "");
      setState(myShopData.shop.state || currentState || "");
      setAddress(myShopData.shop.address || currentAddress || "");
      setCategory(myShopData.shop.shopType?.[0] || "Restaurant");
      setDescription(myShopData.shop.description || "");
      setPrepTime(myShopData.shop.prepTime || 15);
      setDeliveryTime(myShopData.shop.deliveryTime || 30);
      setPreviewImage(myShopData.shop.image || "");
    }
  }, [myShopData, currentCity, currentState, currentAddress]);

  // ADDED: Sync form fields when map location changes (reverse geocoding updates Redux)
  useEffect(() => {
    if (currentCity) setCity(currentCity);
    if (currentState) setState(currentState);
    if (currentAddress) setAddress(currentAddress);
  }, [currentCity, currentState, currentAddress]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreviewImage(URL.createObjectURL(file)); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // FIXED: Required fields validation
    if (!shopName.trim()) {
      toast.error("Shop name is required");
      return;
    }
    if (!Address.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!City.trim()) {
      toast.error("City is required");
      return;
    }
    if (!State.trim()) {
      toast.error("State is required");
      return;
    }

    // FIXED: Coordinate validation - Check if coordinates exist
    const latitude = mapLocation?.lat || myShopData?.shop?.latitude;
    const longitude = mapLocation?.lon || myShopData?.shop?.longitude;
    if (!latitude || !longitude) {
      toast.error("Please select your shop location on the map");
      return;
    }

    const formData = new FormData();
    formData.append("name", shopName);
    if (image) {
      formData.append("image", image);
    }
    formData.append("city", City);
    formData.append("state", State);
    formData.append("address", Address);
    formData.append("shopType", JSON.stringify([category])); // FIXED: shopType as JSON string for multipart/form-data
    formData.append("description", description);
    formData.append("prepTime", prepTime);
    formData.append("deliveryTime", deliveryTime);
    
    // FIXED: Append coordinates (already validated above)
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);

    const isEditing = !!myShopData?.shop?._id;
    
    await request(
      {
        url: isEditing ? `/api/shop/${myShopData.shop._id}` : "/api/shop/",
        method: isEditing ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" }
      },
      {
        loadingMessage: isEditing ? "Updating shop details..." : "Creating your shop...",
        successMessage: isEditing ? "Shop updated successfully!" : "Shop created successfully!",
        onSuccess: (data) => {
          dispatch(setMyShopData(data));
          navigate("/");
        }
      }
    );
  };

  return (
    <div className="flex justify-center flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-white min-h-screen relative">

      {/* Back Button */}
      <div className="absolute top-6 left-6 text-3xl text-orange-400 z-10">
        <ArrowLeft
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
            <Utensils className="text-[#ff4d2d] w-16 h-16" />
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
              value={shopName} // FIXED: Use controlled component pattern
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
            <div className="h-70 w-full border rounded-lg overflow-hidden">
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

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:scale-[1.02] active:scale-95'
              }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                {myShopData?.shop?._id ? "Updating Shop..." : "Creating Shop..."}
              </>
            ) : (
              <>{myShopData?.shop?._id ? "Save Changes" : "Register Shop"}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEditShop;
