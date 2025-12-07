import React  from "react";
import axios from "axios"
import { IoMdCreate } from "react-icons/io";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { serverURL } from "../App";
import { useDispatch } from "react-redux";
import { setMyShopData } from "../redux/ownerSlice";

const OwnerItemCard = ({ item }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

    const handleDelete = async () => {
    try{
      const result =  await axios.get(`${serverURL}/api/item/delete/${item._id}`,{withCredentials:true})
      dispatch(setMyShopData(result.data));
    }catch(err){
      console.log(err,err.message,"something went wrong");
    }
  }
  
  return (
    <div className="relative flex flex-col sm:flex-row w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-orange-300 hover:shadow-3xl transition-shadow duration-300 max-w-4xl mb-6 group">

      {/* Edit & Delete buttons top-right */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {/* Edit */}
        <button
          onClick={() => navigate(`/owner/edit-item/${item._id}`)}
        
          className="p-2 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-500 hover:text-orange-700 transition"
          title="Edit Item"
        >
          <IoMdCreate size={20} />
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}

          className="p-2 rounded-full bg-orange-50 hover:bg-orange-100 text-red-500 hover:text-red-700 transition"
          title="Delete Item"
        >
          <FaTrash size={20} />
        </button>
      </div>

      {/* Image */}
      <div className="relative w-full sm:w-48 h-44 sm:h-auto flex-shrink-0 overflow-hidden rounded-l-2xl group-hover:brightness-90 transition duration-500">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between p-5 flex-1">
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1 truncate">
            {item.name}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-3 min-h-[2.5rem] truncate">
            {item.description || "No description provided."}
          </p>
        </div>
        <div className="text-sm text-gray-500 mb-2">{item.foodType || "Veg"}</div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-orange-600">
            ₹{item.price}
          </span>
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            {item.category || "Other"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OwnerItemCard;
