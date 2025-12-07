import React, { useState } from "react";
import axios from "axios";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaUtensils } from "react-icons/fa6";
import { serverURL } from "../App";
import { setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners"



const CreateEditShop = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { myShopData } = useSelector((state) => state.owner);
  const { currentCity, currentState, currentAddress } = useSelector((state) => state.user);


  // form states
  // const [description, setDescription] = useState(myShopData?.description || "");
  //yaha par .shop isiliye kara hai becoz backend se data ownerSlice me success and shop json me aya hai to ownerslice me shop me name ko access kar rahe hai 
  const [shopName, setShopName] = useState(myShopData?.shop.name || "");
  const [City, setCity] = useState(myShopData?.city || currentCity || "");
  const [State, setState] = useState(myShopData?.shop.state || currentState || "");
  const [Address, setAddress] = useState(myShopData?.address || currentAddress || "");
  const [category, setCategory] = useState(myShopData?.category || "Restaurant");
  const [openTime, setOpenTime] = useState(myShopData?.openTime || "");
  const [closeTime, setCloseTime] = useState(myShopData?.closeTime || "");
  const [image, setImage] = useState(myShopData?.image || "");
  const [previewImage, setPreviewImage] = useState(myShopData?.image || "");
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
      formData.append("name", shopName)
      if (image) {
        formData.append("image", image)
      }
      formData.append("city", City)
      formData.append("state", State)
      formData.append("address", Address)
      formData.append("openTime", openTime)
      formData.append("closeTime", closeTime)

      const response = await axios.post(`${serverURL}/api/shop/create-edit`, formData, { withCredentials: true });

      dispatch(setMyShopData(response.data));
      // dispatch(setMyShopData(response.data.shop));
      console.log("FORM SUBMITTED:", response.data);

      navigate("/");
      setLoading(false);
      
    } catch (error) {
      console.log("AXIOS ERROR RAW =>", error);
      console.log("FORM DATA ERROR =>", error?.response?.data?.error);  //ye specific error show karta hai 
      console.log("MESSAGE =>", error?.response?.data?.message);
      setLoading(false);
    }


  };

  return (
    <div className="flex justify-center flex-col items-center p-6 bg-gradient-to-brfrom-orange-50 to-white min-h-screen relative">

      {/* Back Button */}
      <div className="absolute top-6 left-6 text-3xl text-orange-400 z-10">
        <IoIosArrowRoundBack
          size={35}
          className="border rounded-2xl hover:text-[#ff4d2d] cursor-pointer"
          onClick={() => navigate(-2)}
        />
      </div>

      {/* constainer */}
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
            </select>
          </div>

          {/* opening closing time */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opens At
              </label>
              <input
                type="time"
                className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Closes At
              </label>
              <input
                type="time"
                className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
            </div>
          </div>

          {/* Image Upload */}

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



















// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { IoIosArrowRoundBack } from "react-icons/io";
// import { useNavigate } from "react-router-dom";
// import { useSelector, useDispatch } from "react-redux";
// import { FaUtensils } from "react-icons/fa6";
// import { serverURL } from "../App";
// import { setMyShopData } from "../redux/ownerSlice";

// const CreateEditShop = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const { myShopData } = useSelector((state) => state.owner);
//   const { currentCity, currentState, currentAddress } = useSelector((state) => state.user);

//   const [shopName, setShopName] = useState("");
//   const [City, setCity] = useState("");
//   const [State, setState] = useState("");
//   const [Address, setAddress] = useState("");
//   const [category, setCategory] = useState("Restaurant");
//   const [openTime, setOpenTime] = useState("");
//   const [closeTime, setCloseTime] = useState("");
//   const [image, setImage] = useState(null);
//   const [previewImage, setPreviewImage] = useState("");

//   useEffect(() => {
//     if (myShopData) {
//       setShopName(myShopData.shop?.name || "");
//       setCity(myShopData.shop?.city || currentCity || "");
//       setState(myShopData.shop?.state || currentState || "");
//       setAddress(myShopData.shop?.address || currentAddress || "");
//       setCategory(myShopData.shop?.category || "Restaurant");
//       setOpenTime(myShopData.shop?.openTime || "");
//       setCloseTime(myShopData.shop?.closeTime || "");
//       setPreviewImage(myShopData.shop?.image || "");
//       setImage(null);
//     }
//   }, [myShopData, currentCity, currentState, currentAddress]);

//   const handleImage = (e) => {
//     const file = e.target.files[0];
//     setImage(file);
//     setPreviewImage(URL.createObjectURL(file));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const formData = new FormData();
//       formData.append("name", shopName);
//       if (image) {
//         formData.append("image", image);
//       }
//       formData.append("city", City);
//       formData.append("state", State);
//       formData.append("address", Address);
//       formData.append("openTime", openTime);
//       formData.append("closeTime", closeTime);

//       const response = await axios.post(`${serverURL}/api/shop/create-edit`, formData, { withCredentials: true });

//       dispatch(setMyShopData(response.data.shop));
//       navigate("/");
//     } catch (error) {
//       console.error("Form submission failed:", error);
//     }
//   };

//   return (
//     <div className="flex justify-center flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-white min-h-screen relative">
//       <div className="absolute top-6 left-6 text-3xl text-orange-400 z-10">
//         <IoIosArrowRoundBack
//           size={35}
//           className="border rounded-2xl hover:text-[#ff4d2d] cursor-pointer"
//           onClick={() => navigate("/")}
//         />
//       </div>
//       <div className="max-w-xl w-full bg-white shadow-xl rounded-2xl p-8 border border-orange-100">
//         <div className="flex flex-col items-center mb-6">
//           <div className="bg-orange-100 p-4 rounded-full mb-4">
//             <FaUtensils className="text-[#ff4d2d] w-16 h-16" />
//           </div>
//           <div className="text-3xl font-extrabold text-gray-900">{myShopData ? "Edit Shop" : "Create Shop"}</div>
//         </div>
//         <form onSubmit={handleSubmit}>
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
//             <input
//               type="text"
//               className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
//               placeholder="Enter your shop name"
//               value={shopName}
//               onChange={(e) => setShopName(e.target.value)}
//               required
//             />
//           </div>

//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Shop Image</label>
//             <input type="file" accept="image/*" onChange={handleImage} className="w-full border px-3 py-2 rounded-lg" />
//             {previewImage && (
//               <img src={previewImage} alt="preview" className="w-full h-52 object-cover rounded-lg mt-3 border" />
//             )}
//           </div>

//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
//               <input
//                 type="text"
//                 className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
//                 placeholder="Shop City"
//                 value={City}
//                 onChange={(e) => setCity(e.target.value)}
//                 required
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
//               <input
//                 type="text"
//                 className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
//                 placeholder="Shop State"
//                 value={State}
//                 onChange={(e) => setState(e.target.value)}
//                 required
//               />
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
//             <input
//               type="text"
//               className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400 mb-4"
//               placeholder="Shop Address"
//               value={Address}
//               onChange={(e) => setAddress(e.target.value)}
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
//             <select
//               className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
//               value={category}
//               onChange={(e) => setCategory(e.target.value)}
//             >
//               <option>Restaurant</option>
//               <option>Cafe</option>
//               <option>Fast Food</option>
//               <option>Snacks & Tea</option>
//             </select>
//           </div>

//           <div className="flex gap-4 mb-4">
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700 mb-1">Opens At</label>
//               <input
//                 type="time"
//                 className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
//                 value={openTime}
//                 onChange={(e) => setOpenTime(e.target.value)}
//               />
//             </div>
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700 mb-1">Closes At</label>
//               <input
//                 type="time"
//                 className="w-full border px-3 py-2 rounded-lg focus:outline-orange-400"
//                 value={closeTime}
//                 onChange={(e) => setCloseTime(e.target.value)}
//               />
//             </div>
//           </div>

//           <button
//             type="submit"
//             className="w-full py-3 bg-[#ff4d2d] text-white font-semibold rounded-lg hover:bg-orange-600 transition duration-300"
//           >
//             {myShopData ? "Update Shop" : "Create Shop"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default CreateEditShop;
