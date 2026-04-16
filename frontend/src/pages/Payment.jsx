import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  MapPin,
  ChevronLeft,
  CreditCard,
  CheckCircle,
  DollarSign,
  Smartphone,
  Package,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { clearCart } from "../redux/cartSlice";
import { addPlacedOrder } from "../redux/orderSlice";
import { useApi } from "../hooks/useApi";
import { cn } from "../utility/cn";
import { flattenCartShops, formatINR } from "../utility/cartPricing";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);

    // If extensions/privacy blockers silently block script, onerror is not always reliable.
    // Add a timeout-based fallback check.
    setTimeout(() => {
      if (!window.Razorpay) {
        resolve(false);
      }
    }, 4000);
  });

const generateIdempotencyKey = () => `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const reduxCart = useSelector((state) => state.cart.cart);
  const { request } = useApi();

  const orderDetails = location.state || {};
  const retryOrderId = orderDetails.retryOrderId || null;
  const cartSnapshot = orderDetails.cart || reduxCart;
  const shops = Array.isArray(cartSnapshot?.shops) ? cartSnapshot.shops : [];

  const displayItems = useMemo(() => flattenCartShops(cartSnapshot), [cartSnapshot]);

  const payloadCartItems = useMemo(() => {
    if (Array.isArray(orderDetails.cartItems) && orderDetails.cartItems.length > 0) {
      return orderDetails.cartItems;
    }

    return displayItems.map((item) => ({
      itemId: item.itemId,
      quantity: Number(item.quantity || 1),
      variants: item.selectedVariant ? [item.selectedVariant] : [],
      addons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
    }));
  }, [displayItems, orderDetails.cartItems]);

  const [selectedPaymentOption, setSelectedPaymentOption] = useState(retryOrderId ? "upi" : "cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverQuote, setServerQuote] = useState(null);
  const [quoteMismatch, setQuoteMismatch] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

  const address = orderDetails.address || {};
  const passedTotal = Number(orderDetails.total || 0);
  const passedItemTotal = Number(orderDetails.itemTotal || cartSnapshot?.grandTotal || 0);
  const passedDeliveryFee = Number(orderDetails.deliveryFee || 0);

  useEffect(() => {
    if (!retryOrderId && (shops.length === 0 || payloadCartItems.length === 0)) {
      navigate("/cart");
    }
  }, [navigate, payloadCartItems.length, retryOrderId, shops.length]);

  useEffect(() => {
    const fetchOrderQuote = async () => {
      if (retryOrderId) return;
      if (!address?.address || !address?.location?.lat || !address?.location?.lon) return;
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
      const localTotal = passedTotal || Number((passedItemTotal + passedDeliveryFee).toFixed(2));
      setQuoteMismatch(Math.abs(localTotal - Number(quote.totalAmount || 0)) > 0.01);
    };

    fetchOrderQuote();
  }, [address, passedDeliveryFee, passedItemTotal, passedTotal, payloadCartItems, request, retryOrderId]);

  const displayedItemTotal = Number(serverQuote?.itemsTotal ?? passedItemTotal ?? 0);
  const displayedDeliveryFee = Number(serverQuote?.deliveryFee ?? passedDeliveryFee ?? 0);
  const displayedTotal = Number(serverQuote?.totalAmount ?? passedTotal ?? (displayedItemTotal + displayedDeliveryFee));

  const getBackendPaymentMethod = (uiOption) => (uiOption === "cod" ? "cod" : "online");

  const buildOrderPayload = () => {
    if (payloadCartItems.length === 0) {
      throw new Error("Your cart is empty. Please add items before placing an order.");
    }

    const deliveryAddress = {
      text: address?.address || "",
      landmark: address?.extraDetails || "",
      latitude: Number(address?.location?.lat ?? 0),
      longitude: Number(address?.location?.lon ?? 0),
    };

    if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
      throw new Error("Please provide a valid delivery address.");
    }

    const paymentMethod = getBackendPaymentMethod(selectedPaymentOption);
    return { formattedCartItems: payloadCartItems, deliveryAddress, paymentMethod };
  };

  const buildLocalPlacedOrder = (appOrderId) => ({
    orderId: appOrderId || `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
    paymentMethod: getBackendPaymentMethod(selectedPaymentOption),
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

  const handleCodOrder = async (formattedCartItems, deliveryAddress, paymentMethod, attemptIdempotencyKey) => {
    const { data, error } = await request(
      {
        url: "/api/order/create",
        method: "post",
        data: { cartItems: formattedCartItems, paymentMethod, deliveryAddress, idempotencyKey: attemptIdempotencyKey },
      },
      {
        loadingMessage: "Confirming your order...",
        showToast: false,
      }
    );

    if (error) throw error;
    return data?.order?._id;
  };

  const handleOnlineOrder = async (formattedCartItems, deliveryAddress, attemptIdempotencyKey) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      throw new Error(
        "Unable to load Razorpay checkout. Please disable ad-block/privacy extensions for this site and try again."
      );
    }

    const createResult = await request(
      {
        url: "/api/order/create-razorpay-order",
        method: "post",
        data: {
          cartItems: formattedCartItems,
          paymentMethod: "online",
          deliveryAddress,
          idempotencyKey: attemptIdempotencyKey,
        },
      },
      {
        loadingMessage: "Initializing payment...",
        showToast: false,
      }
    );

    if (createResult.error) throw createResult.error;

    const paymentInit = createResult.data;
    const { appOrderId, razorpayOrderId } = paymentInit;

    const reportPaymentFailure = async (reason) => {
      try {
        await request(
          {
            url: "/api/order/payment-failed",
            method: "post",
            data: {
              appOrderId,
              razorpayOrderId,
              reason,
            },
          },
          { showToast: false }
        );
      } catch {
        // No-op
      }
    };

    await new Promise((resolve, reject) => {
      const razorpayInstance = new window.Razorpay({
        key: paymentInit.key,
        amount: paymentInit.amount,
        currency: paymentInit.currency,
        name: "Zaika",
        description: "Food order payment",
        order_id: paymentInit.razorpayOrderId,
        prefill: {
          name: userData?.fullName || userData?.name || "",
          email: userData?.email || "",
          contact: userData?.mobile || "",
        },
        notes: {
          appOrderId: String(paymentInit.appOrderId || ""),
        },
        handler: async (response) => {
          const verifyResult = await request(
            {
              url: "/api/order/verify-payment",
              method: "post",
              data: {
                appOrderId: paymentInit.appOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            },
            { loadingMessage: "Verifying payment...", showToast: false }
          );

          if (verifyResult.error) {
            await reportPaymentFailure("Payment verification failed");
            reject(verifyResult.error);
            return;
          }

          resolve(verifyResult.data);
        },
        modal: {
          ondismiss: async () => {
            await reportPaymentFailure("Payment cancelled by user");
            reject(new Error("Payment cancelled by user"));
          },
        },
        theme: { color: "#ff4d2d" },
      });

      razorpayInstance.on("payment.failed", async (response) => {
        const msg = response?.error?.description || "Payment failed";
        await reportPaymentFailure(msg);
        reject(new Error(msg));
      });

      razorpayInstance.open();
    });

    return appOrderId;
  };

  const handleRetryOnlineOrder = async (attemptIdempotencyKey) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      throw new Error(
        "Unable to load Razorpay checkout. Please disable ad-block/privacy extensions for this site and try again."
      );
    }

    const retryResult = await request(
      {
        url: `/api/order/${retryOrderId}/retry-payment`,
        method: "post",
        data: { idempotencyKey: attemptIdempotencyKey },
      },
      {
        loadingMessage: "Re-initializing payment...",
        showToast: false,
      }
    );

    if (retryResult.error) throw retryResult.error;

    const paymentInit = retryResult.data;
    const { appOrderId, razorpayOrderId } = paymentInit;

    const reportPaymentFailure = async (reason) => {
      try {
        await request(
          {
            url: "/api/order/payment-failed",
            method: "post",
            data: {
              appOrderId,
              razorpayOrderId,
              reason,
            },
          },
          { showToast: false }
        );
      } catch {
        // No-op
      }
    };

    await new Promise((resolve, reject) => {
      const razorpayInstance = new window.Razorpay({
        key: paymentInit.key,
        amount: paymentInit.amount,
        currency: paymentInit.currency,
        name: "Zaika",
        description: "Retry order payment",
        order_id: paymentInit.razorpayOrderId,
        prefill: {
          name: userData?.fullName || userData?.name || "",
          email: userData?.email || "",
          contact: userData?.mobile || "",
        },
        notes: {
          appOrderId: String(paymentInit.appOrderId || ""),
        },
        handler: async (response) => {
          const verifyResult = await request(
            {
              url: "/api/order/verify-payment",
              method: "post",
              data: {
                appOrderId: paymentInit.appOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            },
            { loadingMessage: "Verifying payment...", showToast: false }
          );

          if (verifyResult.error) {
            await reportPaymentFailure("Payment verification failed");
            reject(verifyResult.error);
            return;
          }

          resolve(verifyResult.data);
        },
        modal: {
          ondismiss: async () => {
            await reportPaymentFailure("Payment cancelled by user");
            reject(new Error("Payment cancelled by user"));
          },
        },
        theme: { color: "#ff4d2d" },
      });

      razorpayInstance.on("payment.failed", async (response) => {
        const msg = response?.error?.description || "Payment failed";
        await reportPaymentFailure(msg);
        reject(new Error(msg));
      });

      razorpayInstance.open();
    });

    return appOrderId;
  };

  const handlePlaceOrder = async () => {
    try {
      setIsProcessing(true);
      const attemptIdempotencyKey = idempotencyKey || generateIdempotencyKey();

      let appOrderId;
      if (retryOrderId) {
        appOrderId = await handleRetryOnlineOrder(attemptIdempotencyKey);
      } else {
        const { formattedCartItems, deliveryAddress, paymentMethod } = buildOrderPayload();
        if (paymentMethod === "cod") {
          appOrderId = await handleCodOrder(formattedCartItems, deliveryAddress, paymentMethod, attemptIdempotencyKey);
        } else {
          appOrderId = await handleOnlineOrder(formattedCartItems, deliveryAddress, attemptIdempotencyKey);
        }
      }

      setIsProcessing(false);
      handleOrderSuccess(appOrderId);
    } catch (err) {
      setIsProcessing(false);
      setIdempotencyKey(generateIdempotencyKey());
      const errorMessage = err?.response?.data?.message || err?.message || "Something went wrong";
      Swal.fire({
        icon: "error",
        title: "Order Failed",
        text: errorMessage,
        confirmButtonColor: "#ff4d2d",
      });
    }
  };

  const paymentOptions = [
    {
      id: "cod",
      title: "Cash on Delivery",
      description: "Pay cash when you receive your order",
      icon: <DollarSign size={24} />,
      color: "bg-green-100 text-green-600",
    },
    {
      id: "upi",
      title: "UPI (Google Pay / PhonePe)",
      description: "Instant payment via UPI app",
      icon: <Smartphone size={24} />,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "card",
      title: "Credit / Debit Card",
      description: "Visa, Mastercard, RuPay",
      icon: <CreditCard size={24} />,
      color: "bg-purple-100 text-purple-600",
    },
  ].filter((opt) => (retryOrderId ? opt.id !== "cod" : true));

  return (
    <div className="min-h-screen bg-[#fff9f6]">
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
            <h3 className="text-xl font-bold text-gray-900">Processing Payment</h3>
            <p className="text-gray-500 text-center text-sm">Please do not close this window...</p>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 bg-[#fff9f6] border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#ff4d2d]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Payment & Review</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 pb-24 grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="text-orange-500" />
              Select Payment Method
            </h2>

            {paymentOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedPaymentOption(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 mb-3 ${
                  selectedPaymentOption === opt.id ? "border-orange-500 bg-orange-50" : "border-gray-100"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${opt.color}`}>{opt.icon}</div>
                <div className="flex-1 text-left">
                  <p className="font-bold">{opt.title}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
                {selectedPaymentOption === opt.id && <CheckCircle className="text-orange-500" />}
              </button>
            ))}
          </div>

          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
              <MapPin /> Delivering To
            </h3>
            <p className="font-bold text-gray-900">{address.label || "Home"}</p>
            <p className="text-sm text-gray-600">{address.address}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="text-orange-500" />
              Order Summary
            </h2>

            {quoteMismatch && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Server pricing is slightly different from checkout. Latest payable amount is shown.
              </div>
            )}

            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
              {shops.map((shop) => (
                <div key={shop.shopId} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">{shop.shopName}</p>
                    <p className="text-xs font-bold text-gray-700">Subtotal: {formatINR(shop.shopSubtotal)}</p>
                  </div>

                  {(shop.items || []).map((item) => (
                    <div key={item.cartItemId} className="flex gap-3 py-2 border-t first:border-t-0">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.name}</p>
                        {item.selectedVariant?.name && (
                          <p className="text-xs text-gray-500">Variant: {item.selectedVariant.name}</p>
                        )}
                        {(item.selectedAddons || []).length > 0 && (
                          <p className="text-xs text-gray-500">
                            Add-ons: {(item.selectedAddons || []).map((addon) => addon.name).join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} x {formatINR(item.priceBreakdown?.finalSinglePrice || 0)}
                        </p>
                      </div>
                      <p className="font-bold text-sm">{formatINR(item.totalPrice || 0)}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2 text-sm mt-4">
              <div className="flex justify-between">
                <span>Item Total</span>
                <span>{formatINR(displayedItemTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className={cn(displayedDeliveryFee === 0 ? "text-emerald-600" : "")}>
                  {displayedDeliveryFee === 0 ? "FREE" : formatINR(displayedDeliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatINR(displayedTotal)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-orange-600 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
          >
            Pay {formatINR(displayedTotal)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;
