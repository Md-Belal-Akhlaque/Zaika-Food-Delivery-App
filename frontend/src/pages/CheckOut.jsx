import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
 import Swal from "sweetalert2";
import { FiChevronLeft, FiMapPin, FiTag, FiClock, FiEdit2, FiTrash2, FiSave, FiX, FiPlus } from "react-icons/fi";
import { setSavedAddresses } from "../redux/userSlice";
import { setLocation, setAddress } from "../redux/mapSlice";
import Map from "../components/Map";

import { serverURL } from "../App";

const CheckOut = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.user.cartItems);
  const savedAddresses = useSelector((state) => state.user.savedAddresses || []);
  const { location, address: mapAddress } = useSelector((state) => state.map);

  const [selectedAddress, setSelectedAddress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullAddress: "",
    pincode: "",
    instructions: "",
    coordinates: { lat: null, lon: null },
  });
  const [addressError, setAddressError] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(true);

  // Fetch saved addresses on mount
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsFetchingAddresses(true);
        const { data } = await axios.get(`${serverURL}/api/user/addresses`, {
          withCredentials: true,
        });
        
        if (Array.isArray(data) && data.length > 0) {
          dispatch(setSavedAddresses(data));
        } else {
          // No addresses exist - show add interface automatically
          setIsEditing(true);
        }
      } catch (err) {
        console.error("Failed to fetch addresses:", err);
        // If error or no addresses, show add interface
        setIsEditing(true);
      } finally {
        setIsFetchingAddresses(false);
      }
    };
    fetchAddresses();
  }, [dispatch]);

  //  Sync map address to form when map updates (real-time synchronization)
  useEffect(() => {
    if (isEditing && mapAddress && location) {
      setAddressForm((prev) => ({
        ...prev,
        fullAddress: mapAddress,
        coordinates: { lat: location.lat, lon: location.lon },
      }));
    }
  }, [mapAddress, location, isEditing]);

  // Address Form Validation
  const validateAddressForm = () => {
    const errors = {};
    
    if (!addressForm.label.trim()) {
      errors.label = "Address label is required";
    }
    
    if (!addressForm.fullAddress.trim()) {
      errors.fullAddress = "Please select a location from the map";
    } else if (addressForm.fullAddress.trim().length < 10) {
      errors.fullAddress = "Address is too short (min 10 characters). Please provide more details.";
    }
    
    if (!addressForm.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(addressForm.pincode)) {
      errors.pincode = "Invalid pincode (must be exactly 6 digits)";
    }
    
    if (!addressForm.coordinates.lat || !addressForm.coordinates.lon) {
      errors.coordinates = "Please select a valid location on the map to ensure accurate delivery";
    }

    return errors;
  };

  //  Handle Add New Address
  const handleAddNew = () => {
    setIsEditing(true);
    setEditId(null);
    setAddressForm({
      label: "Home",
      fullAddress: mapAddress || "",
      pincode: "",
      instructions: "",
      coordinates: { lat: location?.lat || null, lon: location?.lon || null },
    });
    setAddressError("");
  };

  // Handle Edit Existing Address
  const handleEdit = (addr) => {
    setIsEditing(true);
    setEditId(addr.id || addr._id);
    setAddressForm({
      label: addr.label || addr.name,
      fullAddress: addr.address || addr.full_address,
      pincode: addr.pincode || "",
      instructions: addr.extraDetails || addr.instructions || "",
      coordinates: {
        lat: addr.location?.lat || addr.coordinates?.[1],
        lon: addr.location?.lon || addr.coordinates?.[0],
      },
    });
    
    // Update map state to show this address location
    if (addr.location || addr.coordinates) {
      const lat = addr.location?.lat || addr.coordinates?.[1];
      const lon = addr.location?.lon || addr.coordinates?.[0];
      dispatch(setLocation({ lat, lon }));
      dispatch(setAddress(addr.address || addr.full_address));
    }
  };

  //  Handle Delete Address
  const handleDelete = async (e, addressId) => {
    e.stopPropagation();
    
    if (savedAddresses.length <= 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Delete',
        text: 'You must have at least one delivery address.',
        confirmButtonColor: '#f97316'
      });
      return;
    }
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoading(true);
      
      // Delete from backend
      const { data } = await axios.delete(`http://localhost:8000/api/user/addresses/${addressId}`, {
        withCredentials: true,
      });
      
      // Update local state directly from backend response to ensure consistency
      dispatch(setSavedAddresses(data));
      
      // Adjust selected index if needed
      if (selectedAddress >= data.length) {
        setSelectedAddress(Math.max(0, data.length - 1));
      }

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Address has been deleted.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Delete address error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete address. Please try again.',
        confirmButtonColor: '#f97316'
      });
    } finally {
      setIsLoading(false);
    }
  };

  //  Handle Save Address (Create or Update)
  const handleSaveAddress = async () => {
    // Validate form
    const errors = validateAddressForm();
    if (Object.keys(errors).length > 0) {
      setAddressError(Object.values(errors).join(", "));
      return;
    }

    setIsLoading(true);
    setAddressError("");

    const addressData = {
      id: editId || Date.now().toString(), // Ensure ID is present
      label: addressForm.label,
      address: addressForm.fullAddress,
      pincode: addressForm.pincode,
      location: {
        lat: addressForm.coordinates.lat,
        lon: addressForm.coordinates.lon
      },
      extraDetails: addressForm.instructions,
    };

    try {
      // Use POST for both create and update (Backend handles upsert based on ID)
      const { data } = await axios.post(
        "http://localhost:8000/api/user/addresses",
        { address: addressData }, // Wrap in 'address' object as expected by backend
        { withCredentials: true }
      );

      dispatch(setSavedAddresses(data));
      
      if (!editId) {
         // If new address, select it (it will be the last one)
         setSelectedAddress(data.length - 1);
      }
      
      setIsEditing(false);
      setAddressForm({
        label: "Home",
        fullAddress: "",
        pincode: "",
        instructions: "",
        coordinates: { lat: null, lon: null },
      });
      
      Swal.fire({
        icon: 'success',
        title: editId ? 'Updated!' : 'Saved!',
        text: `Address has been ${editId ? 'updated' : 'saved'} successfully.`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Save address error:", err);
      setAddressError(
        err.response?.data?.message || "Failed to save address. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  //  Handle Cancel
  const handleCancel = () => {
    if (savedAddresses.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Address Required',
        text: 'Please add at least one delivery address to continue',
        confirmButtonColor: '#f97316'
      });
      return;
    }
    setIsEditing(false);
    setAddressError("");
  };

  //  Handle Continue to Payment
  const handleContinueToPayment = () => {
    if (savedAddresses.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Address',
        text: 'Please add a delivery address to continue',
        confirmButtonColor: '#f97316'
      });
      return;
    }

    const addressToUse = savedAddresses[selectedAddress];
    if (!addressToUse) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Address',
        text: 'Please select a delivery address',
        confirmButtonColor: '#f97316'
      });
      return;
    }

    navigate("/payment", {
      state: {
        total: totalAfterDiscount,
        itemTotal,
        deliveryFee,
        platformFee,
        packagingFee,
        gst: gstOnFood + gstOnDelivery,
        discount,
        address: {
          id: addressToUse.id || addressToUse._id,
          label: addressToUse.label || addressToUse.name,
          address: addressToUse.address || addressToUse.full_address,
          pincode: addressToUse.pincode,
          extraDetails: addressToUse.extraDetails || addressToUse.instructions,
          location: addressToUse.location || addressToUse.coordinates, 
        },
        timeSlot: timeSlots[selectedTimeSlot],
        coupon: appliedCoupon ? { code: couponCode, ...appliedCoupon } : null,
        cartItems: cartItems.map(item => ({
          ...item,
          itemId: item.id || item._id
        })),
      },
    });
  };

  const timeSlots = [
    { id: 0, label: "Now", time: "15-20 min" },
    { id: 1, label: "30 min", time: new Date(Date.now() + 30 * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
    { id: 2, label: "45 min", time: new Date(Date.now() + 45 * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
    { id: 3, label: "1 hour", time: new Date(Date.now() + 60 * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
  ];

  const availableCoupons = {
    FIRST50: { discount: 50, type: "flat", minOrder: 200 },
    SAVE20: { discount: 20, type: "percent", minOrder: 300 },
    WELCOME100: { discount: 100, type: "flat", minOrder: 500 },
  };

  //  Calculations
  const itemTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const deliveryFee = itemTotal > 500 ? 0 : 40;
  const platformFee = 5;
  const packagingFee = cartItems.length * 3;
  const gstOnFood = itemTotal * 0.05;
  const gstOnDelivery = deliveryFee * 0.18;

  let discount = 0;
  if (appliedCoupon) {
    discount =
      appliedCoupon.type === "flat"
        ? appliedCoupon.discount
        : (itemTotal * appliedCoupon.discount) / 100;
  }

  const totalBeforeDiscount =
    itemTotal + deliveryFee + platformFee + packagingFee + gstOnFood + gstOnDelivery;
  const totalAfterDiscount = totalBeforeDiscount - discount;

  //  Handle Apply Coupon
  const handleApplyCoupon = () => {
    const code = couponCode.toUpperCase().trim();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }

    const coupon = availableCoupons[code];
    if (!coupon) {
      setCouponError("Invalid coupon code");
      setAppliedCoupon(null);
      return;
    }

    if (itemTotal < coupon.minOrder) {
      setCouponError(`Minimum order of ₹${coupon.minOrder} required`);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponError("");
  };

  // Loading state while fetching addresses
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
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-bold text-gray-800">Processing...</p>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-gradient-to-r from-[#ff4d2d]/15 via-[#ffb347]/10 to-[#ff4d2d]/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 top-24 w-96 h-96 rounded-full bg-[#ff4d2d]/5 blur-3xl" />

        {/* Back Button */}
        <button
          onClick={() => navigate("/cart")}
          className="fixed left-4 top-4 z-40 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-orange-200 shadow-lg hover:shadow-xl flex items-center justify-center text-[#ff4d2d] transition-all duration-300"
        >
          <FiChevronLeft size={28} />
        </button>

        <div className="pt-20 px-4 md:px-8 w-full max-w-6xl mx-auto pb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
            Checkout
          </h1>
          <p className="text-gray-600 mb-8">
            Review your order and delivery details
          </p>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN - Main Content */}
            <div className="lg:col-span-2 space-y-5">
              {/* 1. DELIVERY ADDRESS SECTION */}
              <div className="bg-white border-2 border-orange-200 rounded-2xl p-4 md:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiMapPin className="text-orange-500" size={22} />
                    Delivery Address
                  </h3>
                  {!isEditing && savedAddresses.length > 0 && (
                    <button
                      onClick={handleAddNew}
                      className="text-orange-600 text-sm font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <FiPlus size={16} />
                      Add New
                    </button>
                  )}
                </div>

                {isEditing ? (
                  /* ADDRESS CREATION/EDITING INTERFACE */
                  <div className="space-y-4 animate-fadeIn">
                    {/* Map Component with real-time sync */}
                    <Map />

                    {/* Address Form Fields */}
                    <div className="grid sm:grid-cols-3 gap-3">
                      {["Home", "Work", "Other"].map((labelOption) => (
                        <button
                          key={labelOption}
                          type="button"
                          onClick={() =>
                            setAddressForm({ ...addressForm, label: labelOption })
                          }
                          className={`px-4 py-2 rounded-xl border-2 font-semibold transition-all ${
                            addressForm.label === labelOption
                              ? "border-orange-500 bg-orange-50 text-orange-600"
                              : "border-gray-300 text-gray-600 hover:border-orange-300"
                          }`}
                        >
                          {labelOption}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Label Input (if Other is selected or user wants to edit) */}
                    <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">
                            Label Name
                        </label>
                        <input
                            type="text"
                            value={addressForm.label}
                            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                            placeholder="e.g. My Apartment, Office, etc."
                        />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Full Address *
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          (Auto-filled from map, editable)
                        </span>
                      </label>
                      <textarea
                        value={addressForm.fullAddress}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, fullAddress: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none text-sm"
                        rows="3"
                        placeholder="Complete address will appear here from map selection..."
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Pincode *
                        </label>
                        <input
                          type="text"
                          value={addressForm.pincode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setAddressForm({ ...addressForm, pincode: value });
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                          placeholder="560001"
                          maxLength="6"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Delivery Instructions
                          <span className="text-xs font-normal text-gray-500 ml-1">
                            (Optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.instructions}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, instructions: e.target.value })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                          placeholder="Ring doorbell, Gate code, etc."
                        />
                      </div>
                    </div>

                    {/* Coordinates (Hidden Inputs) */}
                    <input type="hidden" name="lat" value={addressForm.coordinates.lat || ""} />
                    <input type="hidden" name="lon" value={addressForm.coordinates.lon || ""} />

                    {/* Coordinates Verification (Optional - can be removed if strictly hidden) */}
                    {(!addressForm.coordinates.lat || !addressForm.coordinates.lon) && (
                         <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                            <p className="text-xs text-red-600 font-bold">
                              ⚠️ Please select a location on the map above
                            </p>
                         </div>
                    )}

                    {/* Error Display */}
                    {addressError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                        <p className="text-sm font-semibold text-red-600">
                          ❌ {addressError}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveAddress}
                        disabled={isLoading}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-400 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSave size={18} />
                        {editId ? "Update Address" : "Save Address"}
                      </button>
                      {savedAddresses.length > 0 && (
                        <button
                          onClick={handleCancel}
                          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* SAVED ADDRESSES DISPLAY */
                  <div className="space-y-3">
                    {savedAddresses.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FiMapPin size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-semibold mb-2">
                          No delivery addresses saved
                        </p>
                        <p className="text-sm mb-4">
                          Add your first address to continue with checkout
                        </p>
                        <button
                          onClick={handleAddNew}
                          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          <FiPlus className="inline mr-2" />
                          Add Delivery Address
                        </button>
                      </div>
                    ) : (
                      savedAddresses.map((addr, idx) => (
                        <div
                          key={addr._id || addr.id}
                          onClick={() => setSelectedAddress(idx)}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all group ${
                            selectedAddress === idx
                              ? "border-orange-500 bg-orange-50 shadow-md"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Radio Button */}
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                selectedAddress === idx
                                  ? "border-orange-500 bg-orange-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedAddress === idx && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>

                            {/* Address Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900">
                                  {addr.label || addr.name}
                                </span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                  {addr.pincode}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 break-words">
                                {addr.address || addr.full_address}
                              </p>
                              {(addr.extraDetails || addr.instructions) && (
                                <p className="text-xs text-orange-600 mt-1 italic">
                                  📝 {addr.extraDetails || addr.instructions}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(addr);
                                }}
                                className="w-9 h-9 rounded-lg hover:bg-orange-100 flex items-center justify-center transition-all"
                                title="Edit Address"
                              >
                                <FiEdit2 size={16} className="text-orange-600" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, addr.id || addr._id)}
                                className="w-9 h-9 rounded-lg hover:bg-red-100 flex items-center justify-center transition-all"
                                title="Delete Address"
                              >
                                <FiTrash2 size={16} className="text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. DELIVERY TIME */}
              <div className="bg-white border-2 border-orange-200 rounded-2xl p-4 md:p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiClock className="text-orange-500" size={22} />
                  Delivery Time
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedTimeSlot(slot.id)}
                      className={`p-3 md:p-4 rounded-xl border-2 transition-all ${
                        selectedTimeSlot === slot.id
                          ? "border-orange-500 bg-orange-50 shadow-md"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <p className="font-bold text-gray-900 text-sm">
                        {slot.label}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{slot.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. APPLY COUPON */}
              <div className="bg-white border-2 border-orange-200 rounded-2xl p-4 md:p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiTag className="text-orange-500" size={22} />
                  Apply Coupon
                </h3>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border-2 border-green-400 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <FiTag className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-green-700 text-lg">
                          {couponCode}
                        </p>
                        <p className="text-sm text-green-600">
                          You saved ₹{discount.toFixed(2)} 🎉
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                      className="text-red-600 text-sm font-semibold hover:underline flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleApplyCoupon();
                        }}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-medium"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="px-4 md:px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                      >
                        Apply
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-red-600 text-sm mt-2 font-medium">
                        ❌ {couponError}
                      </p>
                    )}

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        💡 Available Coupons
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(availableCoupons).map(([code, details]) => (
                          <button
                            key={code}
                            onClick={() => {
                              setCouponCode(code);
                              setCouponError("");
                            }}
                            className="text-xs bg-orange-50 text-orange-700 px-3 py-2 rounded-lg border border-orange-300 hover:bg-orange-100 transition-all font-semibold"
                          >
                            {code}
                            <span className="text-[10px] block text-gray-600">
                              {details.type === "flat"
                                ? `₹${details.discount} OFF`
                                : `${details.discount}% OFF`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - Order Summary (Sticky) */}
            <div className="lg:col-span-1">
              <div className="bg-white border-2 border-orange-200 rounded-2xl p-4 md:p-6 shadow-lg lg:sticky lg:top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-3">
                  Order Summary
                </h3>

                {/* Cart Items Preview */}
                <div className="mb-4 max-h-60 overflow-y-auto space-y-3 pr-2">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-gray-800 font-medium truncate flex-1">
                          {item.name} <span className="text-gray-500 text-xs">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold text-gray-900 flex-shrink-0">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Variants & Addons Display */}
                      <div className="pl-0 mt-1 space-y-0.5">
                        {item.variants && item.variants.length > 0 && (
                            <p className="text-xs text-gray-500 flex items-start gap-1">
                              <span className="font-semibold text-[10px] uppercase tracking-wider text-orange-600/80 mt-[1px]">Variant:</span>
                              <span className="truncate">{item.variants[0].name}</span>
                            </p>
                        )}
                        {item.addons && item.addons.length > 0 && (
                            <p className="text-xs text-gray-500 flex items-start gap-1">
                              <span className="font-semibold text-[10px] uppercase tracking-wider text-green-600/80 mt-[1px]">Addons:</span>
                              <span className="truncate">
                                {item.addons.map(a => a.name).join(", ")}
                              </span>
                            </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 text-sm border-t-2 border-gray-200 pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Item Total</span>
                    <span className="font-semibold">₹{itemTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span
                      className={
                        deliveryFee === 0 ? "text-green-600 font-bold" : "font-semibold"
                      }
                    >
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee</span>
                    <span className="font-semibold">₹{platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Packaging</span>
                    <span className="font-semibold">₹{packagingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST & Charges</span>
                    <span className="font-semibold">
                      ₹{(gstOnFood + gstOnDelivery).toFixed(2)}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-bold">
                      <span>Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t-2 border-gray-300">
                  {appliedCoupon ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">Original Total</span>
                        <span className="text-sm text-gray-500 line-through">
                          ₹{totalBeforeDiscount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">
                          To Pay
                        </span>
                        <span className="text-2xl font-extrabold text-orange-600">
                          ₹{totalAfterDiscount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-2 bg-green-50 px-3 py-2 rounded-lg text-center font-semibold">
                        🎉 You saved ₹{discount.toFixed(2)}!
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">To Pay</span>
                      <span className="text-2xl font-extrabold text-orange-600">
                        ₹{totalBeforeDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {itemTotal < 500 && (
                  <p className="text-xs text-blue-600 mt-3 bg-blue-50 px-3 py-2 rounded-lg text-center">
                    💡 Add ₹{(500 - itemTotal).toFixed(2)} more for FREE delivery
                  </p>
                )}

                {/* Continue to Payment Button */}
                <button
                  onClick={handleContinueToPayment}
                  disabled={isLoading || savedAddresses.length === 0 || isEditing}
                  className="w-full mt-6 bg-gradient-to-r from-orange-500 to-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isEditing
                    ? "Save Address First"
                    : savedAddresses.length === 0
                    ? "Add Address First"
                    : `Continue to Payment • ₹${totalAfterDiscount.toFixed(2)}`}
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  🔒 Secure checkout • Your data is protected
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOut;
