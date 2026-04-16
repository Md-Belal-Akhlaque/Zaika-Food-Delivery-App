import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { setSavedAddresses } from "../redux/userSlice";
import { setLocation, setAddress } from "../redux/mapSlice";
import Map from "../components/Map";
import { useApi } from "../hooks/useApi";
import { cn } from "../utility/cn";
import { flattenCartShops, formatINR } from "../utility/cartPricing";

const defaultCoords = { lat: 28.6139, lon: 77.209 };

const CheckOut = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { request } = useApi();

  const cart = useSelector((state) => state.cart.cart);
  const cartSummary = useSelector((state) => state.cart.summary);
  const cartShops = useMemo(() => (Array.isArray(cart?.shops) ? cart.shops : []), [cart?.shops]);
  const cartItems = useMemo(() => flattenCartShops(cart), [cart]);

  const savedAddresses = useSelector((state) =>
    Array.isArray(state.user.savedAddresses) ? state.user.savedAddresses : []
  );
  const { location, address: mapAddress } = useSelector((state) => state.map);

  const [selectedAddress, setSelectedAddress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullAddress: "",
    pincode: "",
    instructions: "",
    coordinates: defaultCoords,
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(true);
  const [orderQuote, setOrderQuote] = useState(null);

  useEffect(() => {
    if ((cartSummary?.itemCount || 0) === 0) {
      navigate("/cart");
    }
  }, [cartSummary?.itemCount, navigate]);

  useEffect(() => {
    const fetchAddresses = async () => {
      setIsFetchingAddresses(true);
      const { data } = await request(
        {
          url: "/api/user/addresses",
          method: "get",
        },
        { showToast: false }
      );

      const addressList = data?.addresses || [];
      dispatch(setSavedAddresses(addressList));
      if (addressList.length === 0) {
        setIsEditing(true);
      }
      setIsFetchingAddresses(false);
    };

    fetchAddresses();
  }, [dispatch, request]);

  useEffect(() => {
    if (!isEditing) return;
    if (!location) return;

    setAddressForm((prev) => ({
      ...prev,
      fullAddress: mapAddress || prev.fullAddress,
      coordinates: {
        lat: Number(location.lat || prev.coordinates.lat || defaultCoords.lat),
        lon: Number(location.lon || prev.coordinates.lon || defaultCoords.lon),
      },
    }));
  }, [isEditing, location, mapAddress]);

  const formattedCartItems = useMemo(
    () =>
      cartItems
        .map((item) => ({
          itemId: item.itemId,
          quantity: Number(item.quantity || 1),
          variants: item.selectedVariant ? [item.selectedVariant] : [],
          addons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
        }))
        .filter((item) => item.itemId),
    [cartItems]
  );

  useEffect(() => {
    const fetchOrderQuote = async () => {
      const selected = savedAddresses[selectedAddress];
      if (!selected) return;
      if (formattedCartItems.length === 0) return;

      const deliveryAddress = {
        text: selected.address || "",
        landmark: selected.extraDetails || "",
        latitude: Number(selected.location?.lat || 0),
        longitude: Number(selected.location?.lon || 0),
      };

      if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) return;

      const quoteResult = await request(
        {
          url: "/api/order/quote",
          method: "post",
          data: { cartItems: formattedCartItems, deliveryAddress },
        },
        { showToast: false }
      );

      if (quoteResult?.data?.quote) {
        setOrderQuote(quoteResult.data.quote);
      }
    };

    fetchOrderQuote();
  }, [formattedCartItems, request, savedAddresses, selectedAddress]);

  const validateAddressForm = () => {
    if (!addressForm.label.trim()) return "Address label is required";
    if (!addressForm.fullAddress.trim()) return "Please select/enter full address";
    if (!/^\d{6}$/.test(addressForm.pincode || "")) return "Pincode must be 6 digits";
    if (!addressForm.coordinates.lat || !addressForm.coordinates.lon) return "Please select valid map location";
    return "";
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditId(null);
    setAddressForm({
      label: "Home",
      fullAddress: mapAddress || "",
      pincode: "",
      instructions: "",
      coordinates: {
        lat: Number(location?.lat || defaultCoords.lat),
        lon: Number(location?.lon || defaultCoords.lon),
      },
    });
  };

  const handleEdit = (addr) => {
    setIsEditing(true);
    setEditId(addr.id || addr._id);

    setAddressForm({
      label: addr.label || "Home",
      fullAddress: addr.address || "",
      pincode: addr.pincode || "",
      instructions: addr.extraDetails || "",
      coordinates: {
        lat: Number(addr.location?.lat || defaultCoords.lat),
        lon: Number(addr.location?.lon || defaultCoords.lon),
      },
    });

    if (addr.location) {
      dispatch(setLocation({ lat: addr.location.lat, lon: addr.location.lon }));
      dispatch(setAddress(addr.address || ""));
    }
  };

  const handleDelete = async (addressId) => {
    if (savedAddresses.length <= 1) {
      Swal.fire({
        icon: "warning",
        title: "Cannot Delete",
        text: "You must keep at least one address.",
        confirmButtonColor: "#ff4d2d",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete this address?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff4d2d",
      cancelButtonColor: "#d33",
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    const { data } = await request(
      {
        url: `/api/user/addresses/${addressId}`,
        method: "delete",
      },
      {
        loadingMessage: "Deleting address...",
        successMessage: "Address deleted",
      }
    );

    const updatedAddresses = Array.isArray(data?.addresses) ? data.addresses : [];
    dispatch(setSavedAddresses(updatedAddresses));
    if (selectedAddress >= updatedAddresses.length) {
      setSelectedAddress(Math.max(0, updatedAddresses.length - 1));
    }
  };

  const handleSaveAddress = async () => {
    const error = validateAddressForm();
    if (error) {
      Swal.fire({ icon: "warning", title: "Invalid Address", text: error, confirmButtonColor: "#ff4d2d" });
      return;
    }

    setIsLoading(true);
    const addressData = {
      id: editId || Date.now().toString(),
      label: addressForm.label,
      address: addressForm.fullAddress,
      pincode: addressForm.pincode,
      location: {
        lat: Number(addressForm.coordinates.lat),
        lon: Number(addressForm.coordinates.lon),
      },
      extraDetails: addressForm.instructions,
    };

    await request(
      {
        url: "/api/user/addresses",
        method: "post",
        data: { address: addressData },
      },
      {
        loadingMessage: editId ? "Updating address..." : "Saving address...",
        successMessage: editId ? "Address updated" : "Address saved",
        onSuccess: (data) => {
          const updatedAddresses = Array.isArray(data?.addresses) ? data.addresses : [];
          dispatch(setSavedAddresses(updatedAddresses));
          if (!editId && updatedAddresses.length > 0) {
            setSelectedAddress(updatedAddresses.length - 1);
          }
          setIsEditing(false);
        },
      }
    );

    setIsLoading(false);
  };

  const timeSlots = [
    { id: 0, label: "Now", time: "15-20 min" },
    { id: 1, label: "30 min", time: new Date(Date.now() + 30 * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
    { id: 2, label: "45 min", time: new Date(Date.now() + 45 * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
    { id: 3, label: "1 hour", time: new Date(Date.now() + 60 * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
  ];

  const itemTotal = Number(orderQuote?.itemsTotal ?? cart?.grandTotal ?? 0);
  const deliveryFee = Number(orderQuote?.deliveryFee ?? (itemTotal > 500 ? 0 : 40));
  const totalPay = Number(orderQuote?.totalAmount ?? (itemTotal + deliveryFee));

  const handleContinueToPayment = () => {
    if (savedAddresses.length === 0) {
      Swal.fire({ icon: "warning", title: "No Address", text: "Please add a delivery address", confirmButtonColor: "#ff4d2d" });
      return;
    }

    const selected = savedAddresses[selectedAddress];
    if (!selected) {
      Swal.fire({ icon: "warning", title: "Select Address", text: "Please select a valid address", confirmButtonColor: "#ff4d2d" });
      return;
    }

    navigate("/payment", {
      state: {
        total: totalPay,
        itemTotal,
        deliveryFee,
        address: {
          id: selected.id || selected._id,
          label: selected.label || "Home",
          address: selected.address || "",
          pincode: selected.pincode || "",
          extraDetails: selected.extraDetails || "",
          location: selected.location || defaultCoords,
        },
        timeSlot: timeSlots[selectedTimeSlot],
        cart,
        cartItems: formattedCartItems,
      },
    });
  };

  if (isFetchingAddresses) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-800">Loading your addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6]">
      <div className="fixed top-0 w-full z-[100] backdrop-blur-lg bg-white/80 border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-10 h-[70px] md:h-[80px] flex items-center gap-4">
          <button onClick={() => navigate("/cart")} className="p-2 hover:bg-orange-50 rounded-xl transition-colors text-[#ff4d2d]">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl md:text-2xl font-black text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="pt-[90px] pb-24 px-4 md:px-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-orange-50 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-xl text-[#ff4d2d]">
                    <MapPin size={24} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Delivery Address</h2>
                </div>
                {!isEditing && (
                  <button onClick={handleAddNew} className="flex items-center gap-1.5 text-sm font-bold text-[#ff4d2d] hover:text-orange-600 transition-colors">
                    <Plus size={18} /> Add New
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 h-[260px] shadow-inner relative">
                    <Map />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Label (Home/Work)"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    />
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Full address"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                    value={addressForm.fullAddress}
                    onChange={(e) => setAddressForm({ ...addressForm, fullAddress: e.target.value })}
                  />

                  <input
                    type="text"
                    placeholder="Delivery instructions (optional)"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                    value={addressForm.instructions}
                    onChange={(e) => setAddressForm({ ...addressForm, instructions: e.target.value })}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveAddress}
                      disabled={isLoading}
                      className="flex-1 bg-[#ff4d2d] text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {editId ? "Update Address" : "Save Address"}
                    </button>

                    {savedAddresses.length > 0 && (
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 bg-gray-100 text-gray-700 rounded-xl"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((addr, idx) => (
                    <div
                      key={addr.id || addr._id}
                      onClick={() => setSelectedAddress(idx)}
                      className={cn(
                        "relative p-5 rounded-2xl border-2 transition-all cursor-pointer group",
                        selectedAddress === idx
                          ? "bg-orange-50 border-[#ff4d2d] shadow-md shadow-orange-100"
                          : "bg-white border-gray-100 hover:border-orange-200"
                      )}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-900">{addr.label || "Home"}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(addr); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(addr.id || addr._id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600 line-clamp-2 mb-1">{addr.address}</p>
                      <p className="text-[10px] font-bold text-gray-400">PIN: {addr.pincode}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-orange-50 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-xl text-[#ff4d2d]">
                <Clock size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Delivery Time</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {timeSlots.map((slot, idx) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedTimeSlot(idx)}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-center transition-all",
                    selectedTimeSlot === idx ? "bg-orange-50 border-[#ff4d2d]" : "bg-white border-gray-100"
                  )}
                >
                  <p className="text-xs font-black uppercase tracking-widest mb-1 text-gray-900">{slot.label}</p>
                  <p className="text-[10px] font-bold text-gray-500">{slot.time}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-orange-50 overflow-hidden sticky top-[100px]">
            <div className="p-6 md:p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                Order Summary
                <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-lg text-gray-500">
                  {cartSummary.quantityTotal} qty
                </span>
              </h2>

              <div className="space-y-4 mb-8 max-h-[280px] overflow-y-auto pr-2 no-scrollbar">
                {cartShops.map((shop) => (
                  <div key={shop.shopId} className="rounded-2xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500">{shop.shopName}</p>
                      <p className="text-xs font-bold text-gray-700">Subtotal: {formatINR(shop.shopSubtotal)}</p>
                    </div>

                    {(shop.items || []).map((item) => (
                      <div key={item.cartItemId} className="flex justify-between items-start gap-3 py-2 border-t border-gray-50 first:border-t-0">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{item.name}</p>
                          {item.selectedVariant?.name && (
                            <p className="text-[10px] text-gray-500">Variant: {item.selectedVariant.name}</p>
                          )}
                          {(item.selectedAddons || []).length > 0 && (
                            <p className="text-[10px] text-gray-500">
                              Add-ons: {(item.selectedAddons || []).map((addon) => addon.name).join(", ")}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500">
                            Qty: {item.quantity} x {formatINR(item.priceBreakdown?.finalSinglePrice || 0)}
                          </p>
                        </div>
                        <p className="text-sm font-black text-gray-900">{formatINR(item.totalPrice || 0)}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="h-px bg-gray-100 mb-6" />

              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Item Total</span>
                  <span>{formatINR(itemTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Delivery Fee</span>
                  <span className={cn(deliveryFee === 0 ? "text-emerald-600" : "text-gray-500")}>
                    {deliveryFee === 0 ? "FREE" : formatINR(deliveryFee)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-lg font-black text-gray-900">Total Pay</span>
                  <span className="text-2xl font-black text-[#ff4d2d]">{formatINR(totalPay)}</span>
                </div>
              </div>

              <button
                onClick={handleContinueToPayment}
                disabled={isLoading || isEditing}
                className="w-full py-5 rounded-2xl bg-[#ff4d2d] text-white text-xl font-black shadow-xl hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                Proceed to Payment
              </button>

              {(isEditing || savedAddresses.length === 0) && (
                <p className="text-center text-red-500 text-[10px] font-bold mt-4 animate-pulse">
                  Please save your delivery address to proceed
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOut;
