import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiChevronLeft, FiMapPin, FiCreditCard, FiCheckCircle, FiDollarSign, FiSmartphone, FiPackage } from "react-icons/fi";
import Swal from "sweetalert2";
import { clearCart } from "../redux/userSlice";
import { serverURL } from "../App";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get order details from navigation state
  const orderDetails = location.state;

  useEffect(() => {
    if (!orderDetails) {
      navigate("/cart");
    }
  }, [orderDetails, navigate]);

  if (!orderDetails) return null;

  const { 
    total, 
    itemTotal, 
    deliveryFee, 
    platformFee, 
    packagingFee, 
    gst, 
    discount, 
    address, 
    timeSlot,
    cartItems 
  } = orderDetails;

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      const deliveryAddress = {
        text: address.address,
        landmark: address.extraDetails,
        latitude: address.location?.lat || 0,
        longitude: address.location?.lon || 0,
      };

      const { data } = await axios.post(`${serverURL}/api/order/place-order`, {
        cartItems,
        paymentMethod,
        deliveryAddress,
        totalAmount: total,
      }, { withCredentials: true });
      

      setIsProcessing(false);

      // Show Success Message
      await Swal.fire({
        icon: 'success',
        title: 'Order Placed Successfully!',
        text: `Your order has been confirmed.`,
        confirmButtonText: 'Go to Home',
        confirmButtonColor: '#f97316',
        allowOutsideClick: false
      });

      // Clear Cart and Redirect
      dispatch(clearCart());
      navigate("/");
      
    } catch (err) {
      setIsProcessing(false);
      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: err.response?.data?.message || 'Something went wrong!',
        confirmButtonColor: '#f97316'
      });
    }
  };

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
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4 animate-fadeIn">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-gray-900">Processing Payment</h3>
            <p className="text-gray-500 text-center text-sm">
              Please do not close this window or press back...
            </p>
          </div>
        </div>
      )}

      {/* Decorative Background */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-gradient-to-r from-[#ff4d2d]/15 via-[#ffb347]/10 to-[#ff4d2d]/15 blur-2xl" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#fff9f6]/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-orange-200 shadow-sm flex items-center justify-center text-[#ff4d2d] hover:bg-orange-50 transition-all"
          >
            <FiChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Payment & Review</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN - Payment Options */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiCreditCard className="text-orange-500" />
                Select Payment Method
              </h2>
              
              <div className="space-y-3">
                {paymentOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setPaymentMethod(option.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group ${
                      paymentMethod === option.id
                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                        : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/50"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                       paymentMethod === option.id ? "bg-white" : option.color
                    }`}>
                      {React.cloneElement(option.icon, {
                        className: paymentMethod === option.id ? "text-orange-500" : ""
                      })}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${paymentMethod === option.id ? "text-orange-700" : "text-gray-900"}`}>
                        {option.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === option.id
                        ? "border-orange-500 bg-orange-500"
                        : "border-gray-300"
                    }`}>
                      {paymentMethod === option.id && (
                        <FiCheckCircle className="text-white" size={14} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Address Review */}
            <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg opacity-90">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FiMapPin /> Delivering To
              </h3>
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {address.label || address.name}
                  </p>
                  <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                    {address.address || address.full_address}
                  </p>
                  <p className="text-gray-500 text-xs mt-1 font-medium">
                    PIN: {address.pincode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Order Summary */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiPackage className="text-orange-500" />
                Order Summary
              </h2>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                       {/* Placeholder for image */}
                       <span className="text-xs font-bold text-gray-400">IMG</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm pt-4 border-t-2 border-dashed border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Item Total</span>
                  <span>₹{itemTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxes & Charges</span>
                  <span>₹{(deliveryFee + platformFee + packagingFee + gst).toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total Payable</span>
                  <span className="text-2xl font-extrabold text-orange-600">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-orange-600 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
               <FiCheckCircle /> 100% Safe & Secure Payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;