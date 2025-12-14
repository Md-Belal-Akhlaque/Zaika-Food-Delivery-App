import React, { useState } from 'react';
import { useSelector } from "react-redux";
import { ClipLoader } from 'react-spinners';


const OwnerOrderCard = ({ order, onStatusUpdate, onViewDetails }) => {
    const { userData } = useSelector(state => state.user);
    const [isExpanded, setIsExpanded] = useState(false);
    const [preparationTime, setPreparationTime] = useState(order.prepTime || 20);
    const [updatingStatus, setUpdatingStatus] = useState(null);

    const getNormalizedStatus = (status) => {
        if (!status) return 'NEW';
        const s = status.toUpperCase();
        if (s === 'PENDING') return 'NEW';
        if (s === 'PREPARING') return 'PREPARING';
        if (s === 'READY FOR PICKUP' || s === 'READY') return 'READY_FOR_PICKUP';
        if (s === 'OUT FOR DELIVERY') return 'PICKED_UP';
        return s;
    };

    const normalizedStatus = getNormalizedStatus(order.status);

    const statusConfig = {
        NEW: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'New Order' },
        ACCEPTED: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Accepted' },
        PREPARING: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Preparing' },
        READY_FOR_PICKUP: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Ready' },
        PICKED_UP: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Picked Up' },
        DELIVERED: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Delivered' },
        CANCELLED: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Cancelled' },
        REJECTED: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Rejected' }
    };

    const getTimeElapsed = (orderTime) => {
        const now = new Date();
        const ordered = new Date(orderTime);
        const diffMs = now - ordered;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const hours = Math.floor(diffMins / 60);
        return `${hours}h ${diffMins % 60}m ago`;
    };

    const handleStatusChange = async (newStatus) => {
        let backendStatus = newStatus;
        if (newStatus === 'NEW') backendStatus = 'Pending';
        if (newStatus === 'ACCEPTED') backendStatus = 'Accepted'; 
        if (newStatus === 'PREPARING') backendStatus = 'Preparing'; 
        if (newStatus === 'READY_FOR_PICKUP') backendStatus = 'Ready';
        if (newStatus === 'PICKED_UP') backendStatus = 'Out for delivery';
        
        setUpdatingStatus(newStatus);
        try {
            const result = await onStatusUpdate(order.orderId, backendStatus, preparationTime);
            console.log(result.data);
        } catch (error) {
            console.error("Status update failed", error);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleAccept = () => {
        handleStatusChange('ACCEPTED');
    };

    const handleReject = async () => {
        const reason = prompt('Rejection reason:');
        if (reason) {
            setUpdatingStatus('REJECTED');
            try {
                 await onStatusUpdate(order.orderId, 'Cancelled', null, reason); 
            } catch (error) {
                 console.error("Rejection error:", error);
            } finally {
                 setUpdatingStatus(null);
            }
        }                                                                                   
    };

    const currentStatus = statusConfig[normalizedStatus] || statusConfig['NEW'];

    return (
        <div className={`bg-white rounded-lg shadow-md border-l-4 ${currentStatus.border} p-4 mb-4 hover:shadow-lg transition-shadow duration-200`}>
            {/* Card Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">#{order.orderId}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${currentStatus.bg} ${currentStatus.color}`}>
                            {currentStatus.label}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {getTimeElapsed(order.orderTime)}
                        </span>
                        <span className={`flex items-center gap-1 ${order.orderType === 'DELIVERY' ? 'text-blue-600' : 'text-green-600'}`}>
                            {order.orderType === 'DELIVERY' ? '🛵' : '🏪'} {order.orderType}
                        </span>
                        <span className={`flex items-center gap-1 ${order.paymentMode === 'ONLINE' ? 'text-green-600' : 'text-orange-600'}`}>
                            {order.paymentMode === 'ONLINE' ? '💳 Paid' : '💵 COD'}
                        </span>
                    </div>
                </div>
                
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900">₹{order.totalAmount}</h2>
                    <span className="text-sm text-gray-500">{order.items.length} items</span>
                </div>
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <strong>{order.customerName}</strong>
                    </span>
                    <span className="flex items-center gap-2 text-gray-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {order.customerPhone}
                    </span>
                </div>
                {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>
                            {order.deliveryAddress.text || order.deliveryAddress}
                        </span>
                    </div>
                )}
            </div>

            {/*  UPDATED: Order Items with Images, Variants & Addons */}
            <div className="mb-3">
                <button 
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm mb-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    View Items ({order.items.length})
                </button>
                
                {isExpanded && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                
                                {/*  Item with Image */}
                                <div className="flex gap-3 mb-3">
                                    {/* Item Image */}
                                    <div className="flex-shrink-0">
                                        <img 
                                            src={item.image || '/placeholder.png'} 
                                            alt={item.name}
                                            className="w-20 h-20 rounded-lg object-cover border border-gray-300"
                                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                                        />
                                    </div>

                                    {/* Item Details */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800 text-lg">{item.name}</p>
                                                <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-gray-900">₹{item.total}</p>
                                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Qty: {item.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/*  Variants */}
                                {item.variants && item.variants.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                                        <p className="text-xs font-semibold text-blue-700 mb-1">🔘 Variants:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.variants.map((variant, vidx) => (
                                                <span key={vidx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    {variant.name} {variant.price ? `(+₹${variant.price})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/*  Addons */}
                                {item.addons && item.addons.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                                        <p className="text-xs font-semibold text-green-700 mb-1">➕ Add-ons:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.addons.map((addon, aidx) => (
                                                <span key={aidx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                    {addon.name} {addon.price ? `(+₹${addon.price})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Special Instructions */}
                                {item.specialInstructions && (
                                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                                        <p className="text-xs font-semibold text-orange-700 flex items-center gap-1 mb-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            Special Instructions
                                        </p>
                                        <p className="text-xs text-orange-800 italic">{item.specialInstructions}</p>
                                    </div>
                                )}

                            </div>
                        ))}
                        
                        {/*  Order-level Special Instructions */}
                        {order.specialInstructions && (
                            <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mt-3">
                                <p className="text-xs font-bold text-yellow-800 mb-1">📝 Order Special Instructions:</p>
                                <p className="text-sm text-yellow-900">{order.specialInstructions}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
                {normalizedStatus === 'NEW' && (
                    <>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <label className="text-sm font-medium text-gray-700">Prep Time:</label>
                            <input 
                                type="number" 
                                value={preparationTime}
                                onChange={(e) => setPreparationTime(e.target.value)}
                                min="5"
                                max="60"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">mins</span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={handleReject}
                                disabled={updatingStatus === 'REJECTED'}
                            >
                                {updatingStatus === 'REJECTED' ? <ClipLoader size={20} color="#fff" /> : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Reject
                                    </>
                                )}
                            </button>
                            <button 
                                className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={handleAccept}
                                disabled={updatingStatus === 'ACCEPTED'}
                            >
                                {updatingStatus === 'ACCEPTED' ? <ClipLoader size={20} color="#fff" /> : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Accept Order
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}

                {normalizedStatus === 'ACCEPTED' && (
                    <button 
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        onClick={() => handleStatusChange('PREPARING')}
                        disabled={updatingStatus === 'PREPARING'}
                    >
                        {updatingStatus === 'PREPARING' ? <ClipLoader size={20} color="#fff" /> : "👨‍🍳 Start Preparing"}
                    </button>
                )}

                {normalizedStatus === 'PREPARING' && (
                    <button 
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        onClick={() => handleStatusChange('READY_FOR_PICKUP')}
                        disabled={updatingStatus === 'READY_FOR_PICKUP'}
                    >
                        {updatingStatus === 'READY_FOR_PICKUP' ? <ClipLoader size={20} color="#fff" /> : " Mark Ready for Pickup"}
                    </button>
                )}

{normalizedStatus === 'READY_FOR_PICKUP' && (
  <div className="space-y-3">

    {/* ===== DELIVERY PARTNER NOT ASSIGNED ===== */}
    {!order.deliveryPartner && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-sm font-semibold text-yellow-800">
          ⏳ Waiting for delivery partner to accept this order
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          We are notifying nearby delivery partners
        </p>
      </div>
    )}

    {order.deliveryPartner && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <p className="text-sm font-bold text-green-800 mb-1">
      🛵 Delivery Partner Assigned
    </p>

    <div className="flex justify-between items-center text-sm">
      <div>
        <p className="font-semibold text-gray-900">
          {order.deliveryPartner.fullName || order.deliveryPartner.name}
        </p>
        <p className="text-gray-600">
          📞 {order.deliveryPartner.mobile}
        </p>
      </div>

      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
        On the way to pickup
      </span>
    </div>
  </div>
)}


    {/* ===== HANDOVER BUTTON ===== */}
    <button 
      className={`w-full font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2
        ${order.deliveryPartner 
          ? "bg-green-500 hover:bg-green-600 text-white"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      onClick={() => handleStatusChange('PICKED_UP')}
      disabled={!order.deliveryPartner || updatingStatus === 'PICKED_UP'}
    >
      {updatingStatus === 'PICKED_UP' 
        ? <ClipLoader size={20} color="#fff" /> 
        : "🛵 Handed to Delivery Partner"
      }
    </button>

  </div>
)}


                {/* Secondary Actions */}
                <div className="flex gap-2 pt-2">
                    <button 
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                        onClick={() => onViewDetails && onViewDetails(order.orderId)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Details
                    </button>
                    <button 
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                        onClick={() => window.print()}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                    {normalizedStatus !== 'NEW' && normalizedStatus !== 'CANCELLED' && (
                        <button className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Call
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline */}
            {normalizedStatus !== 'NEW' && normalizedStatus !== 'CANCELLED' && normalizedStatus !== 'REJECTED' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                        {['Accepted', 'Preparing', 'Ready', 'Picked', 'Delivered'].map((step, idx) => {
                            const isCompleted = ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].indexOf(normalizedStatus) >= idx;
                            return (
                                <div key={step} className="flex flex-col items-center flex-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {isCompleted ? '✓' : idx + 1}
                                    </div>
                                    <span className={`mt-1 ${isCompleted ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>{step}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerOrderCard;
