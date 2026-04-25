import React from "react";
import { Clock, CreditCard, MapPin, RotateCcw, Package, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../utility/cn";
import { formatINR } from "../utility/cartPricing";

const formatDate = (dateString) => {
  if (!dateString) return "No Date";
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")} ${
    date.getHours() >= 12 ? "PM" : "AM"
  }`;
};

const normalizeStatus = (status = "pending") => String(status).toLowerCase().replace(/\s+/g, "");

const getStatusColor = (status = "pending") => {
  const normalized = normalizeStatus(status);
  if (normalized === "delivered") return "bg-green-100 text-green-700 border-green-200";
  if (normalized === "preparing" || normalized === "processing") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (normalized === "outfordelivery") return "bg-blue-100 text-blue-700 border-blue-200";
  if (normalized === "cancelled") return "bg-red-100 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

const toShopStructure = (order) => {
  if (Array.isArray(order?.shops) && order.shops.length > 0) {
    return order.shops;
  }

  const fallbackItems = Array.isArray(order?.items) ? order.items : [];
  return [
    {
      shopId: order?.shopId || "single-shop",
      shopName: order?.restaurant || order?.shopName || "Shop",
      status: order?.status || "Pending",
      shopSubtotal: Number(order?.itemsTotal ?? order?.itemTotal ?? order?.totalAmount ?? 0),
      items: fallbackItems,
    },
  ];
};

const OrderCard = ({ order }) => {
  const navigate = useNavigate();

  const shops = toShopStructure(order);

  const itemTotal = Number(order?.itemsTotal ?? order?.itemTotal ?? 0);
  const grandTotal = Number(order?.totalAmount ?? order?.grandTotal ?? 0);
  const deliveryFee = Number(order?.deliveryFee ?? 0);

  const normalizedOrderStatus = normalizeStatus(order?.status || shops[0]?.status || "pending");
  const isDelivered = normalizedOrderStatus === "delivered";

  const reorderItems = shops.flatMap((shop) =>
    (shop.items || []).map((item) => ({
      ...item,
      shopId: shop.shopId,
      shopName: shop.shopName,
      variants: item.selectedVariant ? [item.selectedVariant] : item.variants || [],
      addons: item.selectedAddons || item.addons || [],
    }))
  );

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transition hover:shadow-2xl">
      <div className="p-6 border-b flex justify-between items-start gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold shrink-0">
            #{order.orderId || String(order.id || "000000").slice(-6).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{shops.length} Shop Order</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(order.date || order.createdAt)}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", getStatusColor(order.status))}>
            {order.status || "Pending"}
          </span>
          <p className="text-xs text-gray-500 mt-2 flex items-center justify-end gap-1">
            <CreditCard className="w-4 h-4" />
            Cash on Delivery
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {shops.map((shop) => (
          <div key={`${shop.shopId}-${shop.shopOrderId || "local"}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-gray-900">{shop.shopName}</p>
              <span className={cn("px-2 py-1 rounded-full text-[11px] font-bold border", getStatusColor(shop.status || order.status))}>
                {shop.status || order.status || "Pending"}
              </span>
            </div>

            <div className="space-y-3">
              {(shop.items || []).map((item, idx) => {
                const variantName = item.selectedVariant?.name || item.variants?.[0]?.name || item.variants?.[0]?.title || "";
                const addons = item.selectedAddons || item.addons || [];
                const lineTotal = Number(item.totalPrice || 0);
                const unitPrice = Number(item.priceBreakdown?.finalSinglePrice ?? item.price ?? 0);

                return (
                  <div key={`${item.id || item.itemId || idx}-${idx}`} className="flex gap-3">
                    <div className="w-14 h-14 shrink-0 bg-orange-50 rounded-xl overflow-hidden border border-orange-100 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="text-orange-300 w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      {variantName && <p className="text-xs text-gray-600">Variant: {variantName}</p>}
                      {addons.length > 0 && (
                        <p className="text-xs text-gray-600">
                          Add-ons: {addons.map((addon) => addon.name || addon.title).join(", ")}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatINR(unitPrice)} x {item.quantity || 1}
                      </p>
                    </div>

                    <div className="font-bold text-gray-900 text-sm shrink-0">{formatINR(lineTotal)}</div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between text-sm font-bold text-gray-700">
              <span>Shop Subtotal</span>
              <span>{formatINR(shop.shopSubtotal || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Items Total</span>
          <span>{formatINR(itemTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Delivery Fee</span>
          <span>{deliveryFee <= 0 ? "FREE" : formatINR(deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-lg font-extrabold pt-3 border-t">
          <span>Grand Total</span>
          <span className="text-orange-600">{formatINR(grandTotal)}</span>
        </div>
      </div>

      <div className="px-6 py-4 flex gap-3">
        <button
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 bg-gray-100 hover:bg-gray-200 font-semibold"
          onClick={() => navigate("/cart", { state: { reorderItems } })}
        >
          <RotateCcw className="w-4 h-4" />
          Order Again
        </button>

        {!isDelivered && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 bg-orange-500 text-white hover:bg-orange-600 font-semibold"
            onClick={() => navigate(`/track-order/${order.originalOrderId || order.id}`)}
          >
            <MapPin className="w-4 h-4" />
            Track Order
          </button>
        )}

      </div>

      {isDelivered && (
        <div className="px-6 pb-5 text-xs text-emerald-600 font-bold flex items-center gap-2">
          <Truck size={14} /> Delivered successfully
        </div>
      )}
    </div>
  );
};

export default OrderCard;
