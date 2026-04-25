// import React, { useEffect, useMemo, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   MapPin,
//   ChevronLeft,
//   CheckCircle,
//   DollarSign,
//   Package,
//   Loader2,
// } from "lucide-react";
// import Swal from "sweetalert2";
// import { clearCart } from "../redux/cartSlice";
// import { addPlacedOrder } from "../redux/orderSlice";
// import { useApi } from "../hooks/useApi";
// import { cn } from "../utility/cn";
// import { flattenCartShops, formatINR } from "../utility/cartPricing";

// const generateIdempotencyKey = () => `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

// const Payment = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const dispatch = useDispatch();
//   const reduxCart = useSelector((state) => state.cart.cart);
//   const { request } = useApi();

//   useEffect(() => {
//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;
//     document.body.appendChild(script);
//     return () => document.body.removeChild(script);
//   }, []);

//   const orderDetails = location.state || {};
//   const cartSnapshot = orderDetails.cart || reduxCart;
//   const shops = Array.isArray(cartSnapshot?.shops) ? cartSnapshot.shops : [];
//   const address = useMemo(() => orderDetails.address || {}, [orderDetails.address]);

//   const displayItems = useMemo(() => flattenCartShops(cartSnapshot), [cartSnapshot]);

//   const payloadCartItems = useMemo(() => {
//     if (Array.isArray(orderDetails.cartItems) && orderDetails.cartItems.length > 0) {
//       return orderDetails.cartItems;
//     }

//     return displayItems.map((item) => ({
//       itemId: item.itemId,
//       quantity: Number(item.quantity || 1),
//       variants: item.selectedVariant ? [item.selectedVariant] : [],
//       addons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
//     }));
//   }, [displayItems, orderDetails.cartItems]);

//   const [isProcessing, setIsProcessing] = useState(false);
//   const [serverQuote, setServerQuote] = useState(null);
//   const [quoteMismatch, setQuoteMismatch] = useState(false);
//   const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

//   const passedTotal = Number(orderDetails.total || 0);
//   const passedItemTotal = Number(orderDetails.itemTotal || cartSnapshot?.grandTotal || 0);
//   const passedDeliveryFee = Number(orderDetails.deliveryFee || 0);

//   useEffect(() => {
//     if (shops.length === 0 || payloadCartItems.length === 0) {
//       navigate("/cart");
//     }
//   }, [navigate, payloadCartItems.length, shops.length]);



//   useEffect(() => {
//     const fetchOrderQuote = async () => {
//       if (!address?.address || !address?.location?.lat || !address?.location?.lon) return;
//       if (payloadCartItems.length === 0) return;

//       const quoteResult = await request(
//         {
//           url: "/api/order/quote",
//           method: "post",
//           data: {
//             cartItems: payloadCartItems,
//             deliveryAddress: {
//               text: address.address,
//               landmark: address.extraDetails || "",
//               latitude: Number(address.location.lat),
//               longitude: Number(address.location.lon),
//             },
//           },
//         },
//         { showToast: false }
//       );

//       if (quoteResult.error || !quoteResult.data?.quote) return;

//       const quote = quoteResult.data.quote;
//       setServerQuote(quote);
//       const localTotal = passedTotal || Number((passedItemTotal + passedDeliveryFee).toFixed(2));
//       setQuoteMismatch(Math.abs(localTotal - Number(quote.totalAmount || 0)) > 0.01);
//     };

//     fetchOrderQuote();
//   }, [address, passedDeliveryFee, passedItemTotal, passedTotal, payloadCartItems, request]);

//   const displayedItemTotal = Number(serverQuote?.itemsTotal ?? passedItemTotal ?? 0);
//   const displayedDeliveryFee = Number(serverQuote?.deliveryFee ?? passedDeliveryFee ?? 0);
//   const displayedTotal = Number(serverQuote?.totalAmount ?? passedTotal ?? (displayedItemTotal + displayedDeliveryFee));

//   const buildOrderPayload = () => {
//     if (payloadCartItems.length === 0) {
//       throw new Error("Your cart is empty. Please add items before placing an order.");
//     }

//     const deliveryAddress = {
//       text: address?.address || "",
//       landmark: address?.extraDetails || "",
//       latitude: Number(address?.location?.lat ?? 0),
//       longitude: Number(address?.location?.lon ?? 0),
//     };

//     if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
//       throw new Error("Please provide a valid delivery address.");
//     }

//     return { formattedCartItems: payloadCartItems, deliveryAddress, paymentMethod: "cod" };
//   };

//   const buildLocalPlacedOrder = (appOrderId) => ({
//     orderId: appOrderId || `local_${Date.now()}`,
//     createdAt: new Date().toISOString(),
//     paymentMethod: "cod",
//     itemTotal: displayedItemTotal,
//     deliveryFee: displayedDeliveryFee,
//     totalAmount: displayedTotal,
//     grandTotal: displayedTotal,
//     shops: shops.map((shop) => ({
//       shopId: shop.shopId,
//       shopName: shop.shopName,
//       status: "pending",
//       shopSubtotal: Number(shop.shopSubtotal || 0),
//       items: (shop.items || []).map((item) => ({
//         cartItemId: item.cartItemId,
//         itemId: item.itemId,
//         name: item.name,
//         image: item.image,
//         quantity: Number(item.quantity || 1),
//         selectedVariant: item.selectedVariant || null,
//         selectedAddons: item.selectedAddons || [],
//         priceBreakdown: item.priceBreakdown || {},
//         totalPrice: Number(item.totalPrice || 0),
//       })),
//     })),
//   });

//   const handleOrderSuccess = (appOrderId) => {
//     dispatch(addPlacedOrder(buildLocalPlacedOrder(appOrderId)));

//     Swal.fire({
//       icon: "success",
//       title: "Order Placed Successfully!",
//       text: "Your order has been confirmed.",
//       confirmButtonText: "View My Orders",
//       confirmButtonColor: "#ff4d2d",
//       allowOutsideClick: false,
//     }).then(() => {
//       dispatch(clearCart());
//       navigate("/my-orders");
//     });
//   };

//   // Replace handlePlaceOrder with this:
//   const handlePlaceOrder = async () => {
//     try {
//       setIsProcessing(true);
//       const attemptIdempotencyKey = idempotencyKey || generateIdempotencyKey();
//       const { formattedCartItems, deliveryAddress, paymentMethod } = buildOrderPayload();

//       // Step 1: Create Razorpay order on backend
//       const { data: initiateData, error: initiateError } = await request(
//         {
//           url: "/api/order/initiate-payment",
//           method: "post",
//           data: {
//             cartItems: formattedCartItems,
//             deliveryAddress,
//             idempotencyKey: attemptIdempotencyKey,
//           },
//         },
//         { showToast: false }
//       );

//       if (initiateError || !initiateData?.razorpayOrderId) {
//         throw new Error(initiateData?.message || "Failed to initiate payment");
//       }

//       setIsProcessing(false);

//       // Step 2: Open Razorpay modal
//       const options = {
//         key: initiateData.keyId,
//         amount: initiateData.amount,
//         currency: initiateData.currency,
//         name: "Your App Name",
//         description: "Order Payment",
//         order_id: initiateData.razorpayOrderId,
//         handler: async (response) => {
//           // Step 3: Verify payment & create order
//           setIsProcessing(true);
//           try {
//             const { data, error } = await request(
//               {
//                 url: "/api/order/verify-payment",
//                 method: "post",
//                 data: {
//                   razorpayOrderId: response.razorpay_order_id,
//                   razorpayPaymentId: response.razorpay_payment_id,
//                   razorpaySignature: response.razorpay_signature,
//                   cartItems: formattedCartItems,
//                   deliveryAddress,
//                   idempotencyKey: attemptIdempotencyKey,
//                 },
//               },
//               { showToast: false }
//             );

//             if (error) throw error;
//             handleOrderSuccess(data?.order?._id);
//           } catch (err) {
//             setIsProcessing(false);
//             Swal.fire({
//               icon: "error",
//               title: "Order Failed",
//               text: err?.response?.data?.message || err?.message || "Payment verified but order creation failed",
//               confirmButtonColor: "#ff4d2d",
//             });
//           }
//         },
//         prefill: {
//           // Optionally prefill from user state
//           name: "",
//           email: "",
//           contact: "",
//         },
//         theme: { color: "#ff4d2d" },
//         modal: {
//           ondismiss: () => {
//             setIsProcessing(false);
//             setIdempotencyKey(generateIdempotencyKey());
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.on("payment.failed", (response) => {
//         setIsProcessing(false);
//         setIdempotencyKey(generateIdempotencyKey());
//         Swal.fire({
//           icon: "error",
//           title: "Payment Failed",
//           text: response.error?.description || "Payment was not successful",
//           confirmButtonColor: "#ff4d2d",
//         });
//       });

//       rzp.open();
//     } catch (err) {
//       setIsProcessing(false);
//       setIdempotencyKey(generateIdempotencyKey());
//       const errorMessage = err?.response?.data?.message || err?.message || "Something went wrong";
//       Swal.fire({
//         icon: "error",
//         title: "Order Failed",
//         text: errorMessage,
//         confirmButtonColor: "#ff4d2d",
//       });
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#fff9f6]">
//       {isProcessing && (
//         <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
//           <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
//             <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
//             <h3 className="text-xl font-bold text-gray-900">Placing Order</h3>
//             <p className="text-gray-500 text-center text-sm">Please do not close this window...</p>
//           </div>
//         </div>
//       )}

//       <div className="sticky top-0 z-30 bg-[#fff9f6] border-b border-orange-100">
//         <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
//           <button
//             onClick={() => navigate(-1)}
//             className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#ff4d2d]"
//           >
//             <ChevronLeft size={24} />
//           </button>
//           <h1 className="text-xl font-bold text-gray-900">Payment & Review</h1>
//         </div>
//       </div>

//       <div className="max-w-5xl mx-auto px-4 py-8 pb-24 grid md:grid-cols-2 gap-6">
//         <div className="space-y-6">
//           <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
//               <DollarSign className="text-orange-500" />
//               Payment Method
//             </h2>

//             <div className="w-full flex items-center gap-4 p-4 rounded-xl border-2 mb-3 border-orange-500 bg-orange-50">
//               <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600">
//                 <DollarSign size={24} />
//               </div>
//               <div className="flex-1 text-left">
//                 <p className="font-bold">Cash on Delivery</p>
//                 <p className="text-xs text-gray-500">Pay cash when you receive your order</p>
//               </div>
//               <CheckCircle className="text-orange-500" />
//             </div>
//           </div>

//           <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//             <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
//               <MapPin /> Delivering To
//             </h3>
//             <p className="font-bold text-gray-900">{address.label || "Home"}</p>
//             <p className="text-sm text-gray-600">{address.address}</p>
//           </div>
//         </div>

//         <div className="space-y-6">
//           <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
//               <Package className="text-orange-500" />
//               Order Summary
//             </h2>

//             {quoteMismatch && (
//               <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
//                 Server pricing is slightly different from checkout. Latest payable amount is shown.
//               </div>
//             )}

//             <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
//               {shops.map((shop) => (
//                 <div key={shop.shopId} className="rounded-xl border border-gray-100 p-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <p className="text-xs font-black uppercase tracking-widest text-gray-500">{shop.shopName}</p>
//                     <p className="text-xs font-bold text-gray-700">Subtotal: {formatINR(shop.shopSubtotal)}</p>
//                   </div>

//                   {(shop.items || []).map((item) => (
//                     <div key={item.cartItemId} className="flex gap-3 py-2 border-t first:border-t-0">
//                       <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
//                         {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
//                       </div>
//                       <div className="flex-1">
//                         <p className="font-semibold text-sm">{item.name}</p>
//                         {item.selectedVariant?.name && (
//                           <p className="text-xs text-gray-500">Variant: {item.selectedVariant.name}</p>
//                         )}
//                         {(item.selectedAddons || []).length > 0 && (
//                           <p className="text-xs text-gray-500">
//                             Add-ons: {(item.selectedAddons || []).map((addon) => addon.name).join(", ")}
//                           </p>
//                         )}
//                         <p className="text-xs text-gray-500">
//                           Qty: {item.quantity} x {formatINR(item.priceBreakdown?.finalSinglePrice || 0)}
//                         </p>
//                       </div>
//                       <p className="font-bold text-sm">{formatINR(item.totalPrice || 0)}</p>
//                     </div>
//                   ))}
//                 </div>
//               ))}
//             </div>

//             <div className="pt-4 border-t space-y-2 text-sm mt-4">
//               <div className="flex justify-between">
//                 <span>Item Total</span>
//                 <span>{formatINR(displayedItemTotal)}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Delivery Fee</span>
//                 <span className={cn(displayedDeliveryFee === 0 ? "text-emerald-600" : "")}>
//                   {displayedDeliveryFee === 0 ? "FREE" : formatINR(displayedDeliveryFee)}
//                 </span>
//               </div>
//               <div className="flex justify-between font-bold text-lg border-t pt-2">
//                 <span>Total</span>
//                 <span>{formatINR(displayedTotal)}</span>
//               </div>
//             </div>
//           </div>

//           <button
//             onClick={handlePlaceOrder}
//             disabled={isProcessing}
//             className="w-full bg-gradient-to-r from-orange-600 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
//           >
//             // Change button text from "Place Order" to:
//             {isProcessing ? "Processing..." : "Pay Now"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Payment;







import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  MapPin,
  ChevronLeft,
  CheckCircle,
  DollarSign,
  Package,
  Loader2,
  CreditCard,
  Wallet,
} from "lucide-react";
import Swal from "sweetalert2";
import { clearCart } from "../redux/cartSlice";
import { addPlacedOrder } from "../redux/orderSlice";
import { useApi } from "../hooks/useApi";
import { cn } from "../utility/cn";
import { flattenCartShops, formatINR } from "../utility/cartPricing";

const generateIdempotencyKey = () =>
  `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const reduxCart = useSelector((state) => state.cart.cart);
  const { request } = useApi();

  // ── Load Razorpay checkout script ──────────────────────────────────────────
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const orderDetails = location.state || {};
  const cartSnapshot = orderDetails.cart || reduxCart;
  const shops = Array.isArray(cartSnapshot?.shops) ? cartSnapshot.shops : [];
  const address = useMemo(() => orderDetails.address || {}, [orderDetails.address]);

  const displayItems = useMemo(
    () => flattenCartShops(cartSnapshot),
    [cartSnapshot]
  );

  const payloadCartItems = useMemo(() => {
    if (
      Array.isArray(orderDetails.cartItems) &&
      orderDetails.cartItems.length > 0
    ) {
      return orderDetails.cartItems;
    }
    return displayItems.map((item) => ({
      itemId: item.itemId,
      quantity: Number(item.quantity || 1),
      variants: item.selectedVariant ? [item.selectedVariant] : [],
      addons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
    }));
  }, [displayItems, orderDetails.cartItems]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [serverQuote, setServerQuote] = useState(null);
  const [quoteMismatch, setQuoteMismatch] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);
  // ── NEW: track selected payment method ────────────────────────────────────
  const [selectedPayment, setSelectedPayment] = useState("cod");

  const passedTotal = Number(orderDetails.total || 0);
  const passedItemTotal = Number(
    orderDetails.itemTotal || cartSnapshot?.grandTotal || 0
  );
  const passedDeliveryFee = Number(orderDetails.deliveryFee || 0);

  useEffect(() => {
    if (shops.length === 0 || payloadCartItems.length === 0) {
      navigate("/cart");
    }
  }, [navigate, payloadCartItems.length, shops.length]);

  useEffect(() => {
    const fetchOrderQuote = async () => {
      if (
        !address?.address ||
        !address?.location?.lat ||
        !address?.location?.lon
      )
        return;
      if (payloadCartItems.length === 0) return;

      const quoteResult = await request(
        {
          url: "/api/order/quote",
          method: "post",
          data: {
            cartItems: payloadCartItems,
            deliveryAddress: {
              text: address.address,
              landmark: address.extraDetails || "",
              latitude: Number(address.location.lat),
              longitude: Number(address.location.lon),
            },
          },
        },
        { showToast: false }
      );

      if (quoteResult.error || !quoteResult.data?.quote) return;

      const quote = quoteResult.data.quote;
      setServerQuote(quote);
      const localTotal =
        passedTotal ||
        Number((passedItemTotal + passedDeliveryFee).toFixed(2));
      setQuoteMismatch(
        Math.abs(localTotal - Number(quote.totalAmount || 0)) > 0.01
      );
    };

    fetchOrderQuote();
  }, [
    address,
    passedDeliveryFee,
    passedItemTotal,
    passedTotal,
    payloadCartItems,
    request,
  ]);

  const displayedItemTotal = Number(
    serverQuote?.itemsTotal ?? passedItemTotal ?? 0
  );
  const displayedDeliveryFee = Number(
    serverQuote?.deliveryFee ?? passedDeliveryFee ?? 0
  );
  const displayedTotal = Number(
    serverQuote?.totalAmount ??
      passedTotal ??
      displayedItemTotal + displayedDeliveryFee
  );

  // ── Build payload — paymentMethod comes from selectedPayment state ─────────
  const buildOrderPayload = () => {
    if (payloadCartItems.length === 0) {
      throw new Error(
        "Your cart is empty. Please add items before placing an order."
      );
    }

    const deliveryAddress = {
      text: address?.address || "",
      landmark: address?.extraDetails || "",
      latitude: Number(address?.location?.lat ?? 0),
      longitude: Number(address?.location?.lon ?? 0),
    };

    if (
      !deliveryAddress.text ||
      !deliveryAddress.latitude ||
      !deliveryAddress.longitude
    ) {
      throw new Error("Please provide a valid delivery address.");
    }

    return {
      formattedCartItems: payloadCartItems,
      deliveryAddress,
      paymentMethod: selectedPayment, // "cod" or "online"
    };
  };

  const buildLocalPlacedOrder = (appOrderId) => ({
    orderId: appOrderId || `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
    paymentMethod: selectedPayment,
    itemTotal: displayedItemTotal,
    deliveryFee: displayedDeliveryFee,
    totalAmount: displayedTotal,
    grandTotal: displayedTotal,
    shops: shops.map((shop) => ({
      shopId: shop.shopId,
      shopName: shop.shopName,
      status: "pending",
      shopSubtotal: Number(shop.shopSubtotal || 0),
      items: (shop.items || []).map((item) => ({
        cartItemId: item.cartItemId,
        itemId: item.itemId,
        name: item.name,
        image: item.image,
        quantity: Number(item.quantity || 1),
        selectedVariant: item.selectedVariant || null,
        selectedAddons: item.selectedAddons || [],
        priceBreakdown: item.priceBreakdown || {},
        totalPrice: Number(item.totalPrice || 0),
      })),
    })),
  });

  const handleOrderSuccess = (appOrderId) => {
    dispatch(addPlacedOrder(buildLocalPlacedOrder(appOrderId)));

    Swal.fire({
      icon: "success",
      title: "Order Placed Successfully!",
      text: "Your order has been confirmed.",
      confirmButtonText: "View My Orders",
      confirmButtonColor: "#ff4d2d",
      allowOutsideClick: false,
    }).then(() => {
      dispatch(clearCart());
      navigate("/my-orders");
    });
  };

  // ── COD flow ───────────────────────────────────────────────────────────────
  const handleCodOrder = async (
    formattedCartItems,
    deliveryAddress,
    attemptIdempotencyKey
  ) => {
    const { data, error } = await request(
      {
        url: "/api/order/create",
        method: "post",
        data: {
          cartItems: formattedCartItems,
          paymentMethod: "cod",
          deliveryAddress,
          idempotencyKey: attemptIdempotencyKey,
        },
      },
      { showToast: false }
    );

    if (error) throw error;
    handleOrderSuccess(data?.order?._id);
  };

  // ── Online / Razorpay flow ─────────────────────────────────────────────────
  const handleOnlineOrder = async (
    formattedCartItems,
    deliveryAddress,
    attemptIdempotencyKey
  ) => {
    // Step 1: Create Razorpay order on backend
    const { data: initiateData, error: initiateError } = await request(
      {
        url: "/api/order/initiate-payment",
        method: "post",
        data: {
          cartItems: formattedCartItems,
          deliveryAddress,
          idempotencyKey: attemptIdempotencyKey,
        },
      },
      { showToast: false }
    );

    if (initiateError || !initiateData?.razorpayOrderId) {
      throw new Error(
        initiateData?.message || "Failed to initiate payment"
      );
    }

    // Stop spinner while Razorpay modal is open
    setIsProcessing(false);

    // Step 2: Open Razorpay modal
    return new Promise((resolve, reject) => {
      const options = {
        key: initiateData.keyId,
        amount: initiateData.amount,
        currency: initiateData.currency,
        name: "Your App Name",
        description: "Order Payment",
        order_id: initiateData.razorpayOrderId,
        handler: async (response) => {
          setIsProcessing(true);
          try {
            // Step 3: Verify payment & create order
            const { data, error } = await request(
              {
                url: "/api/order/verify-payment",
                method: "post",
                data: {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  cartItems: formattedCartItems,
                  deliveryAddress,
                  idempotencyKey: attemptIdempotencyKey,
                },
              },
              { showToast: false }
            );

            if (error) throw error;
            resolve(data?.order?._id);
          } catch (err) {
            reject(err);
          }
        },
        prefill: { name: "", email: "", contact: "" },
        theme: { color: "#ff4d2d" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setIdempotencyKey(generateIdempotencyKey());
            reject(new Error("DISMISSED"));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setIsProcessing(false);
        setIdempotencyKey(generateIdempotencyKey());
        reject(
          new Error(
            response.error?.description || "Payment was not successful"
          )
        );
      });

      rzp.open();
    });
  };

  // ── Main handler — routes to COD or Online ────────────────────────────────
  const handlePlaceOrder = async () => {
    try {
      setIsProcessing(true);
      const attemptIdempotencyKey =
        idempotencyKey || generateIdempotencyKey();
      const { formattedCartItems, deliveryAddress } = buildOrderPayload();

      if (selectedPayment === "online") {
        const orderId = await handleOnlineOrder(
          formattedCartItems,
          deliveryAddress,
          attemptIdempotencyKey
        );
        handleOrderSuccess(orderId);
      } else {
        await handleCodOrder(
          formattedCartItems,
          deliveryAddress,
          attemptIdempotencyKey
        );
      }
    } catch (err) {
      if (err?.message === "DISMISSED") return; // user closed modal — no alert needed
      setIsProcessing(false);
      setIdempotencyKey(generateIdempotencyKey());
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      Swal.fire({
        icon: "error",
        title: selectedPayment === "online" ? "Payment Failed" : "Order Failed",
        text: errorMessage,
        confirmButtonColor: "#ff4d2d",
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fff9f6]">
      {/* Full-screen processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
            <h3 className="text-xl font-bold text-gray-900">
              {selectedPayment === "online"
                ? "Verifying Payment..."
                : "Placing Order"}
            </h3>
            <p className="text-gray-500 text-center text-sm">
              Please do not close this window...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#fff9f6] border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#ff4d2d]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            Payment & Review
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 pb-24 grid md:grid-cols-2 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Payment Method Card */}
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Wallet className="text-orange-500" />
              Payment Method
            </h2>

            {/* Cash on Delivery */}
            <div
              onClick={() => setSelectedPayment("cod")}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all duration-200",
                selectedPayment === "cod"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"
              )}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600 shrink-0">
                <DollarSign size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">Cash on Delivery</p>
                <p className="text-xs text-gray-500">
                  Pay cash when you receive your order
                </p>
              </div>
              {selectedPayment === "cod" ? (
                <CheckCircle className="text-orange-500 shrink-0" size={22} />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
              )}
            </div>

            {/* Online Payment — Razorpay */}
            <div
              onClick={() => setSelectedPayment("online")}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                selectedPayment === "online"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"
              )}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                <CreditCard size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">Online Payment</p>
                <p className="text-xs text-gray-500">
                  UPI · Card · Net Banking via Razorpay
                </p>
              </div>
              {selectedPayment === "online" ? (
                <CheckCircle className="text-orange-500 shrink-0" size={22} />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
              )}
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
              <MapPin size={16} /> Delivering To
            </h3>
            <p className="font-bold text-gray-900">
              {address.label || "Home"}
            </p>
            <p className="text-sm text-gray-600 mt-1">{address.address}</p>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="text-orange-500" />
              Order Summary
            </h2>

            {quoteMismatch && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Server pricing is slightly different from checkout. Latest
                payable amount is shown.
              </div>
            )}

            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
              {shops.map((shop) => (
                <div
                  key={shop.shopId}
                  className="rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                      {shop.shopName}
                    </p>
                    <p className="text-xs font-bold text-gray-700">
                      Subtotal: {formatINR(shop.shopSubtotal)}
                    </p>
                  </div>

                  {(shop.items || []).map((item) => (
                    <div
                      key={item.cartItemId}
                      className="flex gap-3 py-2 border-t first:border-t-0"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {item.name}
                        </p>
                        {item.selectedVariant?.name && (
                          <p className="text-xs text-gray-500">
                            Variant: {item.selectedVariant.name}
                          </p>
                        )}
                        {(item.selectedAddons || []).length > 0 && (
                          <p className="text-xs text-gray-500">
                            Add-ons:{" "}
                            {(item.selectedAddons || [])
                              .map((addon) => addon.name)
                              .join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} ×{" "}
                          {formatINR(
                            item.priceBreakdown?.finalSinglePrice || 0
                          )}
                        </p>
                      </div>
                      <p className="font-bold text-sm shrink-0">
                        {formatINR(item.totalPrice || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-4 border-t space-y-2 text-sm mt-4">
              <div className="flex justify-between text-gray-600">
                <span>Item Total</span>
                <span>{formatINR(displayedItemTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span
                  className={cn(
                    displayedDeliveryFee === 0 ? "text-emerald-600 font-semibold" : ""
                  )}
                >
                  {displayedDeliveryFee === 0
                    ? "FREE"
                    : formatINR(displayedDeliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatINR(displayedTotal)}</span>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-orange-600 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition-opacity active:scale-[0.99]"
          >
            {isProcessing
              ? "Processing..."
              : selectedPayment === "online"
              ? `Pay ${formatINR(displayedTotal)}`
              : "Place Order"}
          </button>

          {selectedPayment === "online" && (
            <p className="text-center text-xs text-gray-400">
              Secured by Razorpay · 100% Safe & Encrypted
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;