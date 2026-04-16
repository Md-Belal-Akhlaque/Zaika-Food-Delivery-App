import { Pencil, Trash2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toggleItemAvailability, deleteItemFromShop } from "../redux/ownerSlice";
import { useApi } from "../hooks/useApi";
import Swal from "sweetalert2";

const OwnerItemCard = ({ item }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { request } = useApi();

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Delete item?",
      text: "This will remove the item from your active menu.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    await request(
      {
        url: `/api/item/delete/${item._id}`,
        method: "delete",
      },
      {
        loadingMessage: "Deleting item...",
        successMessage: "Item deleted successfully",
        onSuccess: () => {
          dispatch(deleteItemFromShop(item._id));
        },
      }
    );
  };

  const handleToggleAvailability = async () => {
    await request(
      {
        url: `/api/item/toggle-availability/${item._id}`,
        method: "patch",
      },
      {
        loadingMessage: "Updating availability...",
        onSuccess: (data) => {
          dispatch(toggleItemAvailability({ itemId: item._id, isAvailable: data.isAvailable }));
        },
      }
    );
  };

  const originalPrice = Number(item?.price || 0);
  const offerPrice = Number(
    item?.discountPrice != null && item?.discountPrice !== ""
      ? item.discountPrice
      : originalPrice
  );
  const hasDiscount = offerPrice > 0 && offerPrice < originalPrice;
  const normalizedVariants = Array.isArray(item?.variants) ? item.variants : [];
  const normalizedAddons = Array.isArray(item?.addons) ? item.addons : [];
  const categoryLabel = String(item?.category || "other")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

  return (
    <div className={`relative flex flex-col sm:flex-row w-full bg-white rounded-2xl shadow-lg overflow-hidden border ${item.isAvailable ? 'border-orange-300' : 'border-gray-300 opacity-90'} hover:shadow-3xl transition-shadow duration-300 max-w-4xl mb-6 group`}>

      {/* Edit, Delete & Availability top-right */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 items-center">
        {/* Availability Toggle */}
        <button
            onClick={handleToggleAvailability}
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                item.isAvailable 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
            title="Toggle Availability"
        >
            {item.isAvailable ? 'In Stock' : 'Sold Out'}
        </button>

        {/* Edit */}
        <button
          onClick={() => navigate(`/owner/edit-item/${item._id}`)}
        
          className="p-2 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-500 hover:text-orange-700 transition"
          title="Edit Item"
        >
          <Pencil size={18} />
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}

          className="p-2 rounded-full bg-orange-50 hover:bg-orange-100 text-red-500 hover:text-red-700 transition"
          title="Delete Item"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Image */}
      <div className="relative w-full sm:w-48 h-44 sm:h-auto flex-shrink-0 overflow-hidden rounded-l-2xl group-hover:brightness-90 transition duration-500">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-400">
            <Package size={48} />
          </div>
        )}
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
        {(normalizedVariants.length > 0 || normalizedAddons.length > 0) && (
          <div className="mb-3 space-y-1">
            {normalizedVariants.length > 0 && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-700">Variants:</span>{" "}
                {normalizedVariants
                  .map((v) => `${v?.name || "Variant"} (₹${Number(v?.price || 0)})`)
                  .join(", ")}
              </p>
            )}
            {normalizedAddons.length > 0 && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-700">Add-ons:</span>{" "}
                {normalizedAddons
                  .map((a) => `${a?.title || "Add-on"} (₹${Number(a?.price || 0)})`)
                  .join(", ")}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through font-semibold">
                ₹{originalPrice}
              </span>
            )}
            <span className="text-xl font-bold text-orange-600">₹{offerPrice}</span>
            {hasDiscount && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {Math.round(((originalPrice - offerPrice) / originalPrice) * 100)}% OFF
              </span>
            )}
          </div>
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            {categoryLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OwnerItemCard;
