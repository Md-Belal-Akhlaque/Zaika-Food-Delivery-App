import { useState, useEffect, useCallback } from "react";
import axios from 'axios';
import { FaMotorcycle } from "react-icons/fa6";
import { MdDeliveryDining, MdOutlineCheckCircle, MdOutlinePayments, MdNewReleases } from "react-icons/md";
import { HiOutlineUser } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUserData, setCartItem } from "../redux/userSlice";
import { serverURL } from "../App";
import useUpdateLocation from "../hooks/useUpdateLocation";

const DeliveryPartnerDashboard = () => {
  useUpdateLocation();
  const [activeTab, setActiveTab] = useState('available');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  
  const { userData } = useSelector(state => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'available') endpoint = '/api/delivery/available-assignments';
      else endpoint = '/api/delivery/my-assignments';

      const res = await axios.get(`${serverURL}${endpoint}`, { withCredentials: true });
      
      console.log(" API Response:", res.data);
      
      if (res.data.success) {
        let data = res.data.assignments;
    
        //  FIX: Use assignmentStatus instead of status
        if (activeTab === 'ongoing') {
          data = data.filter(a => ['assigned', 'picked'].includes(a.assignmentStatus));
        } else if (activeTab === 'completed') {
          data = data.filter(a => ['delivered', 'cancelled'].includes(a.assignmentStatus));
        }
        
        console.log(" Filtered assignments:", data);
        setAssignments(data);
      }
    } catch (err) {
      console.error(" Fetch assignments failed:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 15000);
    return () => clearInterval(interval);
  }, [fetchAssignments]);

  // Update location periodically
  useEffect(() => {
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await axios.patch(`${serverURL}/api/user/update-location`, {
                lat: latitude,
                lon: longitude
              }, { withCredentials: true });
              console.log(" Location updated:", latitude, longitude);
            } catch (err) {
              console.error("Failed to update location", err);
            }
          },
          (error) => console.error("Geolocation error", error),
          { enableHighAccuracy: true }
        );
      }
    };

    updateLocation();
    const locInterval = setInterval(updateLocation, 60000);
    return () => clearInterval(locInterval);
  }, []);

  const handleAccept = async (id) => {
    console.log(" Accepting assignment ID:", id);
    try {
      await axios.post(`${serverURL}/api/delivery/accept`, { assignmentId: id }, { withCredentials: true });
      alert("Order Accepted! ");
      fetchAssignments();
    } catch (err) {
      console.error(" Accept error:", err);
      alert("Failed to accept: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePicked = async (id) => {
    try {
      await axios.patch(`${serverURL}/api/delivery/mark-picked`, { assignmentId: id }, { withCredentials: true });
      alert("Order Picked! ");
      fetchAssignments();
    } catch (err) {
      console.error("Failed to mark picked", err);
      alert("Failed to mark picked");
    }
  };

  const handleDelivered = async (id) => {
    try {
      await axios.patch(`${serverURL}/api/delivery/mark-delivered`, { assignmentId: id }, { withCredentials: true });
      alert("Order Delivered! ");
      fetchAssignments();
    } catch (err) {
      console.error("Failed to mark delivered", err);
      alert("Failed to mark delivered");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${serverURL}/api/auth/signout`, {}, { withCredentials: true });
      localStorage.clear();
      dispatch(setCartItem([]));
      dispatch(setUserData(null));
      navigate("/signin");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff9f6]">
      {/* Navbar */}
      <div className="w-full h-[80px] flex items-center justify-between px-5 fixed top-0 z-[50] bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <FaMotorcycle size={30} className="text-[#ff4d2d]" />
          <h1 className="text-2xl font-bold text-[#ff4d2d]">Delivery Panel</h1>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex items-center gap-8 text-gray-600 font-medium">
          <button 
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${activeTab === 'available' ? 'text-[#ff4d2d] bg-orange-50' : 'hover:text-[#ff4d2d]'}`}
          >
            <MdNewReleases size={22} /> New Requests
          </button>
          <button 
            onClick={() => setActiveTab('ongoing')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${activeTab === 'ongoing' ? 'text-[#ff4d2d] bg-orange-50' : 'hover:text-[#ff4d2d]'}`}
          >
            <MdDeliveryDining size={22} /> Ongoing
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${activeTab === 'completed' ? 'text-[#ff4d2d] bg-orange-50' : 'hover:text-[#ff4d2d]'}`}
          >
            <MdOutlineCheckCircle size={22} /> Completed
          </button>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setOpenProfile(!openProfile)}
            className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
          >
            <HiOutlineUser size={28} className="text-gray-700 hover:text-[#ff4d2d]" />
          </button>
          {openProfile && (
            <div className="absolute right-0 w-[200px] bg-white shadow-xl rounded-xl border border-gray-200 mt-2 p-3 z-[50]">
              <p className="font-semibold text-gray-700">{userData?.fullName}</p>
              <p className="text-sm text-gray-500 mb-3">{userData?.email}</p>
              <button onClick={handleLogout} className="w-full text-left py-2 px-2 rounded-lg hover:bg-red-50 text-red-500 font-semibold">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-3 z-[50]">
        <button onClick={() => setActiveTab('available')} className={`flex flex-col items-center text-xs ${activeTab === 'available' ? 'text-[#ff4d2d]' : 'text-gray-500'}`}>
          <MdNewReleases size={24} /> New
        </button>
        <button onClick={() => setActiveTab('ongoing')} className={`flex flex-col items-center text-xs ${activeTab === 'ongoing' ? 'text-[#ff4d2d]' : 'text-gray-500'}`}>
          <MdDeliveryDining size={24} /> Ongoing
        </button>
        <button onClick={() => setActiveTab('completed')} className={`flex flex-col items-center text-xs ${activeTab === 'completed' ? 'text-[#ff4d2d]' : 'text-gray-500'}`}>
          <MdOutlineCheckCircle size={24} /> Done
        </button>
      </div>

      {/* Content */}
      <div className="pt-[100px] pb-[80px] px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
          {activeTab === 'available' ? 'New Delivery Requests' : `${activeTab} Deliveries`}
        </h2>
        
        {loading && <p className="text-center text-gray-500">Loading...</p>}
        
        {!loading && assignments.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No {activeTab} assignments found.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {assignments.map(assignment => {
            const shopOrder = assignment.order?.shopOrders?.find(so => so._id === assignment.shopOrderId);
            const items = shopOrder?.shopOrderItems || [];
            const deliveryAddr = assignment.order?.deliveryAddress;

            return (
              <div key={assignment._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                {/* Header: ID, Shop Name, Status */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      ORDER: {assignment.order?._id?.slice(-6).toUpperCase() || 'N/A'}
                    </span>
                    <h3 className="font-bold text-lg mt-2 text-gray-800">{assignment.shop?.name || 'Restaurant'}</h3>
                    <p className="text-sm text-gray-500">{assignment.shop?.address || ''}, {assignment.shop?.city || ''}</p>
                    {assignment.shop?.latitude && assignment.shop?.longitude && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${assignment.shop.latitude},${assignment.shop.longitude}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-[#ff4d2d] underline mt-1 inline-block"
                      >
                        View Shop Location
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    {/*  FIX: Use assignmentStatus */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      assignment.assignmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                      assignment.assignmentStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                      assignment.assignmentStatus === 'picked' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {assignment.assignmentStatus || 'pending'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {assignment.createdAt ? new Date(assignment.createdAt).toLocaleTimeString() : 'N/A'}
                    </p>
                    <div className="mt-2 text-sm font-semibold">
                      {assignment.order?.paymentMethod === 'cod' ? (
                        <span className="text-orange-600 flex items-center justify-end gap-1">
                          <MdOutlinePayments /> Collect Cash
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center justify-end gap-1">
                          <MdOutlineCheckCircle /> Paid Online
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Order Items</p>
                  <ul className="space-y-1">
                    {items.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex justify-between">
                        <span>{item.quantity} x {item.name}</span>
                        <span className="font-medium">₹{item.price * item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-bold">
                    <span>Total to Collect (if COD):</span>
                    <span>₹{assignment.order?.paymentMethod === 'cod' ? shopOrder?.subtotal || 0 : 0}</span>
                  </div>
                </div>

                {/* Customer / Delivery Details */}
                <div className="border-t border-dashed border-gray-200 pt-3">
                  <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Deliver To</p>
                  <p className="text-gray-800 font-medium">{deliveryAddr?.text || 'Address not available'}</p>
                  {deliveryAddr?.landmark && <p className="text-sm text-gray-500">Landmark: {deliveryAddr.landmark}</p>}
                  
                  {deliveryAddr?.latitude && deliveryAddr?.longitude && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${deliveryAddr.latitude},${deliveryAddr.longitude}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-[#ff4d2d] underline mt-1 inline-block"
                    >
                      Navigate to Customer
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-gray-100">
                  {activeTab === 'available' && (
                    <button 
                      onClick={() => handleAccept(assignment._id)}
                      className="w-full sm:w-auto px-6 py-2 bg-[#ff4d2d] text-white font-bold rounded-lg hover:bg-[#e84224] transition shadow-md"
                    >
                      Accept Order
                    </button>
                  )}

                  {/*  FIX: Use assignmentStatus */}
                  {activeTab === 'ongoing' && assignment.assignmentStatus === 'assigned' && (
                    <button 
                      onClick={() => handlePicked(assignment._id)}
                      className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition shadow-md"
                    >
                      Mark as Picked
                    </button>
                  )}

                  {/*  FIX: Use assignmentStatus */}
                  {activeTab === 'ongoing' && assignment.assignmentStatus === 'picked' && (
                    <button 
                      onClick={() => handleDelivered(assignment._id)}
                      className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-md"
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
