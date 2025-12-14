import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { serverURL } from "../App";
import { FiChevronLeft, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${serverURL}/api/delivery/status/${orderId}`, {
        withCredentials: true
      });
      if (res.data.success) {
        setAssignment(res.data.assignment);
      }
      setLoading(false);
    } catch (err) {
      console.error("Fetch status failed", err);
      // Don't set error on poll failure to avoid flickering, unless it's initial load
      if (loading) setError("Waiting for delivery assignment...");
      setLoading(false);
    }
  }, [orderId, loading]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) return <div className="p-8 text-center">Loading tracking info...</div>;
  
  if (!assignment) return (
    <div className="min-h-screen bg-gray-50 p-4">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-gray-600">
        <FiChevronLeft /> Back
      </button>
      <div className="bg-white p-8 rounded-xl shadow-sm text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Assigned Yet</h2>
        <p className="text-gray-500">We are looking for a delivery partner...</p>
      </div>
    </div>
  );

  const rider = assignment.assignedTo;
  const riderLoc = rider?.location?.coordinates; // [lon, lat]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <FiChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Track Order</h1>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-gray-200">
        {riderLoc ? (
          <MapContainer 
            center={[riderLoc[1], riderLoc[0]]} 
            zoom={15} 
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[riderLoc[1], riderLoc[0]]}>
              <Popup>
                Delivery Partner: {rider.fullName}
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Map data unavailable
          </div>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-white p-6 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] -mt-6 relative z-10">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {assignment.status === 'picked' ? 'On the way' : 
               assignment.status === 'delivered' ? 'Delivered' : 
               'Preparing / Assigned'}
            </h2>
            <p className="text-sm text-gray-500">
              Arriving in ~25 mins
            </p>
          </div>
          <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold capitalize">
            {assignment.status}
          </div>
        </div>

        {/* Rider Info */}
        {rider && (
          <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <FiUser size={24} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{rider.fullName}</h3>
              <p className="text-xs text-gray-500">Delivery Partner</p>
            </div>
            <a 
              href={`tel:${rider.mobile}`}
              className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
            >
              <FiPhone size={20} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
