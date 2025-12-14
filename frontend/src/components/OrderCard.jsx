// OrderCard.jsx
import React, { useState } from 'react';
import { Star, Clock, CreditCard, MapPin, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OrderCard = ({ order }) => {
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const formatDate = (dateString) => {
    if (!dateString) return "No Date";
    const date = new Date(dateString);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getHours()%12 || 12}:${String(date.getMinutes()).padStart(2,"0")} ${date.getHours()>=12?"PM":"AM"}`;
  };

  const getStatusColor = (status = "pending") => {
    switch (status.toLowerCase()) {
      case "delivered": return "bg-green-100 text-green-700 border-green-200";
      case "preparing": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "out for delivery": return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const isDelivered = order.status?.toLowerCase() === "delivered";

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transition hover:shadow-2xl">

      {/* ===== HEADER ===== */}
      <div className="p-6 border-b flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold">
            #{order.orderId || order.shop?._id ||"000000"}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {order.restaurant || "Restaurant"}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(order.date)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
            {order.status || "Pending"}
          </span>
          <p className="text-xs text-gray-500 mt-2 flex items-center justify-end gap-1">
            <CreditCard className="w-4 h-4" />
            {order.paymentMode === "COD" ? "Cash on Delivery" : "Online Paid"}
          </p>
        </div>
      </div>

      {/* ===== ITEMS ===== */}
      <div className="p-6 space-y-4">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex gap-4 bg-gray-50 rounded-2xl p-4">
            <img
              src={item.image || "/placeholder.png"}
              alt={item.name}
              className="w-16 h-16 rounded-xl object-cover"
            />

            <div className="flex-1">
              <p className="font-semibold text-gray-900">{item.name}</p>

              {item.variants?.length > 0 && (
                <p className="text-xs text-gray-600">
                  Variant: {item.variants.map(v => v.name).join(", ")}
                </p>
              )}

              {item.addons?.length > 0 && (
                <p className="text-xs text-gray-600">
                  Add-ons: {item.addons.map(a => `${a.name} (+₹${a.price})`).join(", ")}
                </p>
              )}

              <p className="text-sm text-gray-500">
                ₹{item.price} × {item.quantity}
              </p>
            </div>

            <div className="font-bold text-gray-900">
              ₹{item.total}
            </div>
          </div>
        ))}
      </div>

      {/* ===== SUMMARY ===== */}
      <div className="px-6 py-4 border-t text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Items Total</span>
          <span>₹{order.itemsTotal || order.price || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Delivery Fee</span>
          <span>₹{order.deliveryFee || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Platform Fee</span>
          <span>₹{order.platformFee || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">GST</span>
          <span>₹{order.gst || 0}</span>
        </div>

        <div className="flex justify-between text-lg font-extrabold pt-3 border-t">
          <span>Total</span>
          <span className="text-orange-600">₹{order.totalAmount || 0}</span>
        </div>
      </div>

      {/* ===== ACTION BUTTONS ===== */}
      <div className="px-6 py-4 flex gap-3">
        <button
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 bg-gray-100 hover:bg-gray-200 font-semibold"
          onClick={() => navigate("/cart", { state: { reorderItems: order.items } })}
        >
          <RotateCcw className="w-4 h-4" />
          Order Again
        </button>

        {!isDelivered && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 bg-orange-500 text-white hover:bg-orange-600 font-semibold"
            onClick={() => navigate(`/track-order/${order.originalOrderId}`)}
          >
            <MapPin className="w-4 h-4" />
            Track Order
          </button>
        )}
      </div>

      {/* ===== RATING (ONLY AFTER DELIVERY) ===== */}
      {isDelivered && (
        <div className="px-6 py-5 border-t bg-gray-50">
          <h4 className="font-bold text-gray-800 mb-3">Rate your order</h4>

          <div className="flex gap-2 mb-3">
            {[1,2,3,4,5].map(star => (
              <Star
                key={star}
                onClick={() => setRating(star)}
                className={`w-6 h-6 cursor-pointer ${
                  rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                }`}
              />
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Write a review..."
            className="w-full rounded-xl border p-3 text-sm focus:ring-2 focus:ring-orange-400"
          />

          <button
            className="mt-3 w-full bg-green-500 text-white rounded-xl py-3 font-semibold hover:bg-green-600"
          >
            Submit Review
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
