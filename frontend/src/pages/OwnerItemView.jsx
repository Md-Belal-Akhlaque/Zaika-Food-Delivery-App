import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Pencil } from "lucide-react";
import { useApi } from "../hooks/useApi";

const OwnerItemView = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { request } = useApi();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      const { data } = await request(
        { url: `/api/item/get-item/${itemId}`, method: "get" },
        { showToast: false }
      );
      setItem(data?.item || null);
      setLoading(false);
    };
    fetchItem();
  }, [itemId, request]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading item details...</div>;
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Item not found</p>
        <button className="px-4 py-2 bg-orange-500 text-white rounded-lg" onClick={() => navigate("/owner/menu-list")}>
          Back to Menu
        </button>
      </div>
    );
  }

  const originalPrice = Number(item.price || 0);
  const discountPrice = item.discountPrice != null ? Number(item.discountPrice) : null;
  const hasDiscount = discountPrice != null && discountPrice > 0 && discountPrice < originalPrice;

  return (
    <div className="min-h-screen bg-[#fff9f6] p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-orange-100 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <button onClick={() => navigate("/owner/menu-list")} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => navigate(`/owner/edit-item/${item._id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold"
          >
            <Pencil size={14} /> Edit Item
          </button>
        </div>

        <img src={item.image} alt={item.name} className="w-full h-64 object-cover" />

        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">{item.name}</h1>
          <p className="text-gray-600">{item.description || "No description provided."}</p>

          <div className="flex items-center gap-4">
            {hasDiscount ? (
              <>
                <span className="text-2xl font-black text-emerald-600">₹{discountPrice}</span>
                <span className="text-lg text-gray-400 line-through">₹{originalPrice}</span>
              </>
            ) : (
              <span className="text-2xl font-black text-orange-600">₹{originalPrice}</span>
            )}
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 uppercase">{item.category}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{item.foodType}</span>
            <span className="text-xs flex items-center gap-1 text-gray-500">
              <Clock size={12} /> {item.prepTime || 10} min
            </span>
          </div>

          {Array.isArray(item.variants) && item.variants.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 mb-2">Variants</h3>
              <div className="space-y-1">
                {item.variants.map((v, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {v.name} - ₹{Number(v.price || 0)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(item.addons) && item.addons.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 mb-2">Add-ons</h3>
              <div className="space-y-1">
                {item.addons.map((a, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {a.title} - ₹{Number(a.price || 0)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerItemView;
