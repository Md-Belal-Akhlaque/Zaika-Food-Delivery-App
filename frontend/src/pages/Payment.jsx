import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

// icons
import { 
  FiMapPin, 
  FiChevronLeft, 
  FiCreditCard, 
  FiCheckCircle, 
  FiDollarSign, 
  FiSmartphone,
  FiPackage
} from "react-icons/fi";

import Swal from "sweetalert2";
import { clearCart } from "../redux/userSlice";
import { serverURL } from "../App";

/* ================= SAFE HELPERS (BACKEND PROOF) ================= */

const safeText = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return v.title ?? v.name ?? v.label ?? v._id ?? "";
};

const getImage = (item) =>
  item?.image ||
  item?.item?.image ||
  item?.itemId?.image ||
  "";

const getItemName = (item) =>
  item?.name ||
  item?.item?.name ||
  item?.itemId?.name ||
  "Item";

const getShopName = (item) =>
  item?.shopName ||
  item?.shop?.name ||
  item?.shop?.title ||
  "";

const getPrice = (item) =>
  Number(item?.price ?? item?.item?.price ?? 0);

const getQty = (item) =>
  Number(item?.quantity ?? 1);

const getVariants = (item) =>
  Array.isArray(item?.variants) ? item.variants : [];

const getAddons = (item) =>
  Array.isArray(item?.addons) ? item.addons : [];

/* ================================================================ */

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isProcessing, setIsProcessing] = useState(false);

  const orderDetails = location.state ?? {};

  useEffect(() => {
    if (!location.state) navigate("/cart");
  }, [location.state, navigate]);

  if (!location.state) return null;

  const { 
    total = 0,
    itemTotal: passedItemTotal = 0,
    deliveryFee = 0,
    platformFee = 0,
    packagingFee = 0,
    gst = 0,
    discount = 0,
    address = {},
    cartItems = []
  } = orderDetails;

  const computedItemTotal = cartItems.reduce(
    (s, it) => s + getPrice(it) * getQty(it),
    0
  );

  const effectiveItemTotal = Number(
    computedItemTotal || passedItemTotal || 0
  );

  /* ================= PLACE ORDER ================= */

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      const deliveryAddress = {
        text: address?.address || "",
        landmark: address?.extraDetails || "",
        latitude: address?.location?.lat || 0,
        longitude: address?.location?.lon || 0,
      };

      const formattedCartItems = cartItems.map(item => ({
        ...item,
        itemId: item.id || item._id
      }));

      await axios.post(
        `${serverURL}/api/order/create`,
        {
          cartItems: formattedCartItems,
          paymentMethod,
          deliveryAddress
        },
        { withCredentials: true }
      );

      setIsProcessing(false);

      await Swal.fire({
        icon: "success",
        title: "Order Placed Successfully!",
        text: "Your order has been confirmed.",
        confirmButtonText: "View My Orders",
        confirmButtonColor: "#f97316",
        allowOutsideClick: false
      });

      dispatch(clearCart());
      navigate("/my-orders");

    } catch (err) {
      setIsProcessing(false);
      Swal.fire({
        icon: "error",
        title: "Order Failed",
        text: err.response?.data?.message || "Something went wrong!",
        confirmButtonColor: "#f97316",
      });
    }
  };

  /* ================= PAYMENT OPTIONS ================= */

  const paymentOptions = [
    {
      id: "cod",
      title: "Cash on Delivery",
      description: "Pay cash when you receive your order",
      icon: <FiDollarSign size={24} />,
      color: "bg-green-100 text-green-600"
    },
    {
      id: "upi",
      title: "UPI (Google Pay / PhonePe)",
      description: "Instant payment via UPI app",
      icon: <FiSmartphone size={24} />,
      color: "bg-blue-100 text-blue-600"
    },
    {
      id: "card",
      title: "Credit / Debit Card",
      description: "Visa, Mastercard, RuPay",
      icon: <FiCreditCard size={24} />,
      color: "bg-purple-100 text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-[#fff9f6]">

      {/* PROCESSING */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-gray-900">Processing Payment</h3>
            <p className="text-gray-500 text-center text-sm">Please do not close this window...</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-[#fff9f6] border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#ff4d2d]"
          >
            <FiChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Payment & Review</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 grid md:grid-cols-2 gap-6">

        {/* LEFT */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FiCreditCard className="text-orange-500" />
              Select Payment Method
            </h2>

            {paymentOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPaymentMethod(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 mb-3 ${
                  paymentMethod === opt.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-100"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${opt.color}`}>
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{opt.title}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
                {paymentMethod === opt.id && <FiCheckCircle className="text-orange-500" />}
              </button>
            ))}
          </div>

          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
              <FiMapPin /> Delivering To
            </h3>
            <p className="font-bold text-gray-900">{address.label || "Home"}</p>
            <p className="text-sm text-gray-600">{address.address}</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FiPackage className="text-orange-500" />
              Order Summary
            </h2>

            {cartItems.map((item, idx) => {
              const totalItem = getPrice(item) * getQty(item);
              return (
                <div key={idx} className="flex gap-3 py-3 border-b">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                    {getImage(item) && (
                      <img src={getImage(item)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{getItemName(item)}</p>
                    {getShopName(item) && (
                      <p className="text-xs text-gray-500">Shop: {getShopName(item)}</p>
                    )}
                    <p className="text-xs text-gray-500">Qty: {getQty(item)}</p>
                  </div>
                  <p className="font-bold">₹{totalItem.toFixed(2)}</p>
                </div>
              );
            })}

            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Item Total</span>
                <span>₹{effectiveItemTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Charges</span>
                <span>
                  ₹{(deliveryFee + platformFee + packagingFee + gst).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-orange-600 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg"
          >
            Pay ₹{total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;














// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useLocation, useNavigate } from "react-router-dom";
// import { useDispatch } from "react-redux";

// // icons
// import { 
//   FiMapPin, 
//   FiChevronLeft, 
//   FiCreditCard, 
//   FiCheckCircle, 
//   FiDollarSign, 
//   FiSmartphone,
//   FiPackage
// } from "react-icons/fi";

// import Swal from "sweetalert2";
// import { clearCart } from "../redux/userSlice";
// import { serverURL } from "../App";

// /** Safe text helper so we never render an object directly */
// const safeText = (v) => {
//   if (v == null) return "";
//   if (typeof v === "string" || typeof v === "number") return String(v);
//   return v.title ?? v.name ?? v.label ?? v._id ?? JSON.stringify(v);
// };

// const Payment = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const dispatch = useDispatch();

//   const [paymentMethod, setPaymentMethod] = useState("cod");
//   const [isProcessing, setIsProcessing] = useState(false);

//   // Read orderDetails safely (we still redirect if absent)
//   const orderDetails = location.state ?? {};

//   useEffect(() => {
//     if (!location.state) navigate("/cart");
//   }, [location.state, navigate]);

//   if (!location.state) return null;

//   // Extract safely using fallback values
//   const { 
//     total = 0,
//     // keep itemTotal if you want, but we'll compute from cartItems to be safe
//     itemTotal: passedItemTotal = 0,
//     deliveryFee = 0,
//     platformFee = 0,
//     packagingFee = 0,
//     gst = 0,
//     discount = 0,
//     address = {},
//     timeSlot,
//     cartItems = []
//   } = orderDetails;

//   // compute item total from cartItems to avoid mismatches
//   const computedItemTotal = cartItems.reduce((s, it) => {
//     const price = Number(it.price || 0);
//     const qty = Number(it.quantity || 0) || 1;
//     return s + price * qty;
//   }, 0);

//   const effectiveItemTotal = Number(computedItemTotal || passedItemTotal || 0);

//   // -----------------------------------
//   // PLACE ORDER HANDLER
//   // -----------------------------------
//   const handlePlaceOrder = async () => {
//   setIsProcessing(true);

//   try {
//     const deliveryAddress = {
//       text: address?.address || "",
//       landmark: address?.extraDetails || "",
//       latitude: address?.location?.lat || 0,
//       longitude: address?.location?.lon || 0,
//     };

//     const formattedCartItems = cartItems.map(item => ({
//       ...item,
//       itemId: item.id || item._id
//     }));

//     const result = await axios.post(
//       `${serverURL}/api/order/create`,
//       {
//         cartItems: formattedCartItems,
//         paymentMethod,
//         deliveryAddress
//       },
//       { withCredentials: true }
//     );

//     setIsProcessing(false);

//     await Swal.fire({
//       icon: "success",
//       title: "Order Placed Successfully!",
//       text: "Your order has been confirmed.",
//       confirmButtonText: "View My Orders",
//       confirmButtonColor: "#f97316",
//       allowOutsideClick: false
//     });

//     dispatch(clearCart());
//     navigate("/my-orders");

//   } catch (err) {
//     setIsProcessing(false);

//     Swal.fire({
//       icon: "error",
//       title: "Order Failed",
//       text: err.response?.data?.message || "Something went wrong!",
//       confirmButtonColor: "#f97316",
//     });
//   }
// };


//   // -----------------------------------
//   // PAYMENT METHODS
//   // -----------------------------------
//   const paymentOptions = [
//     {
//       id: "cod",
//       title: "Cash on Delivery",
//       description: "Pay cash when you receive your order",
//       icon: <FiDollarSign size={24} />,
//       color: "bg-green-100 text-green-600"
//     },
//     {
//       id: "upi",
//       title: "UPI (Google Pay / PhonePe)",
//       description: "Instant payment via UPI app",
//       icon: <FiSmartphone size={24} />,
//       color: "bg-blue-100 text-blue-600"
//     },
//     {
//       id: "card",
//       title: "Credit / Debit Card",
//       description: "Visa, Mastercard, RuPay",
//       icon: <FiCreditCard size={24} />,
//       color: "bg-purple-100 text-purple-600"
//     }
//   ];

//   return (
//     <div className="min-h-screen bg-[#fff9f6]">

//       {/* PROCESSING OVERLAY */}
//       {isProcessing && (
//         <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
//           <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
//             <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
//             <h3 className="text-xl font-bold text-gray-900">Processing Payment</h3>
//             <p className="text-gray-500 text-center text-sm">Please do not close this window...</p>
//           </div>
//         </div>
//       )}

//       {/* HEADER */}
//       <div className="sticky top-0 z-30 bg-[#fff9f6] border-b border-orange-100 backdrop-blur-md">
//         <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
//           <button
//             onClick={() => navigate(-1)}
//             className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#ff4d2d] hover:bg-orange-50"
//           >
//             <FiChevronLeft size={24} />
//           </button>
//           <h1 className="text-xl font-bold text-gray-900">Payment & Review</h1>
//         </div>
//       </div>

//       <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
//         <div className="grid md:grid-cols-2 gap-6">

//           {/* LEFT COLUMN */}
//           <div className="space-y-6">
//             {/* PAYMENT SELECTION */}
//             <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//               <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
//                 <FiCreditCard className="text-orange-500" />
//                 Select Payment Method
//               </h2>

//               <div className="space-y-3">
//                 {paymentOptions.map((opt) => (
//                   <button
//                     key={opt.id}
//                     onClick={() => setPaymentMethod(opt.id)}
//                     className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
//                       paymentMethod === opt.id 
//                         ? "border-orange-500 bg-orange-50" 
//                         : "border-gray-100 hover:border-orange-200"
//                     }`}
//                   >
//                     <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === opt.id ? "bg-white" : opt.color}`}>
//                       {opt.icon}
//                     </div>

//                     <div className="flex-1">
//                       <p className={`font-bold ${paymentMethod === opt.id ? "text-orange-700" : "text-gray-900"}`}>
//                         {opt.title}
//                       </p>
//                       <p className="text-xs text-gray-500">{opt.description}</p>
//                     </div>

//                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
//                       paymentMethod === opt.id ? "border-orange-500 bg-orange-500" : "border-gray-300"
//                     }`}>
//                       {paymentMethod === opt.id && <FiCheckCircle className="text-white" size={14} />}
//                     </div>
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {/* DELIVERY ADDRESS */}
//             <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//               <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
//                 <FiMapPin /> Delivering To
//               </h3>

//               <div className="flex gap-3">
//                 <div className="mt-1">
//                   <span className="w-2 h-2 bg-green-500 inline-block rounded-full" />
//                 </div>

//                 <div>
//                   <p className="font-bold text-gray-900 text-lg">
//                     {address.label || address.name || "Home"}
//                   </p>
//                   <p className="text-gray-600 text-sm mt-1">
//                     {address.address || address.full_address || "Address not available"}
//                   </p>
//                   <p className="text-gray-500 text-xs mt-1">
//                     PIN: {address.pincode || "000000"}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* RIGHT COLUMN — ORDER SUMMARY */}
//           <div className="space-y-6">
//             <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//               <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
//                 <FiPackage className="text-orange-500" />
//                 Order Summary
//               </h2>

//               <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
//                 {cartItems.map((item, idx) => {
//                   const perItemTotal = (Number(item.price || 0) * (Number(item.quantity) || 1));
//                   // stable key: prefer cartId > itemId > id/_id
//                   const key = item.cartId || item.itemId || item.id || item._id || idx;

//                   return (
//                     <div key={key} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
//                       {/* IMAGE */}
//                       <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
//                         {item.image ? (
//                           <img src={item.image} alt={safeText(item.name)} className="w-full h-full object-cover" />
//                         ) : (
//                           <span className="text-xs text-gray-400">IMG</span>
//                         )}
//                       </div>

//                       {/* ITEM DETAILS */}
//                       <div className="flex-1 min-w-0">
//                         <p className="font-semibold text-gray-800 text-sm truncate">{safeText(item.name)}</p>

//                         {/* Shop name (if available) */}
//                         { (item.shopName || (item.shop && (item.shop.name || item.shop))) && (
//                           <p className="text-xs text-gray-500">
//                             <span className="font-medium">Shop:</span> {safeText(item.shopName || item.shop?.name || item.shop)}
//                           </p>
//                         )}

//                         {/* VARIANT */}
//                         {Array.isArray(item?.variants) && item.variants.length > 0 && (
//                           <p className="text-xs text-gray-600">
//                             <span className="font-semibold">Variant:</span>{" "}
//                             {item.variants.map(v => safeText(v.title ?? v.name ?? v)).join(", ")}
//                           </p>
//                         )}

//                         {/* ADDONS */}
//                         {Array.isArray(item?.addons) && item.addons.length > 0 && (
//                           <p className="text-xs text-gray-600">
//                             <span className="font-semibold">Add-ons:</span>{" "}
//                             {item.addons
//                               .map(a => `${safeText(a.title ?? a.name ?? a)} (+₹${Number(a.price || 0)})`)
//                               .join(", ")}
//                           </p>
//                         )}

//                         <p className="text-xs text-gray-500 mt-1">Qty: {Number(item.quantity || 0)}</p>
//                       </div>

//                       {/* PRICE */}
//                       <p className="font-bold text-gray-900 text-sm">₹{perItemTotal.toFixed(2)}</p>
//                     </div>
//                   );
//                 })}
//               </div>

//               {/* PRICING */}
//               <div className="space-y-2 text-sm pt-4 border-t border-gray-200">
//                 <div className="flex justify-between text-gray-600">
//                   <span>Item Total</span>
//                   <span>₹{effectiveItemTotal.toFixed(2)}</span>
//                 </div>

//                 <div className="flex justify-between text-gray-600">
//                   <span>Taxes & Charges</span>
//                   <span>₹{(Number(deliveryFee || 0) + Number(platformFee || 0) + Number(packagingFee || 0) + Number(gst || 0)).toFixed(2)}</span>
//                 </div>

//                 {Number(discount || 0) > 0 && (
//                   <div className="flex justify-between text-green-600 font-bold">
//                     <span>Discount</span>
//                     <span>-₹{Number(discount).toFixed(2)}</span>
//                   </div>
//                 )}

//                 <div className="flex justify-between items-center pt-4 mt-3 border-t border-gray-200">
//                   <span className="text-lg font-bold text-gray-900">Total Payable</span>
//                   <span className="text-2xl font-extrabold text-orange-600">₹{Number(total || (effectiveItemTotal + deliveryFee + platformFee + packagingFee + gst - discount)).toFixed(2)}</span>
//                 </div>
//               </div>
//             </div>

//             <button
//               onClick={handlePlaceOrder}
//               disabled={isProcessing}
//               className="w-full bg-gradient-to-r from-orange-600 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
//             >
//               {isProcessing ? "Processing..." : `Pay ₹${Number(total || (effectiveItemTotal + deliveryFee + platformFee + packagingFee + gst - discount)).toFixed(2)}`}
//             </button>

//             <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
//               <FiCheckCircle /> 100% Safe & Secure Payment
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// // 
// export default Payment;
