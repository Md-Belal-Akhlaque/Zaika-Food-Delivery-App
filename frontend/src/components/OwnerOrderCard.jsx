import React, { useState } from 'react';
import { useSelector } from "react-redux";
import { 
  Clock, 
  Bike, 
  Store, 
  CreditCard, 
  User, 
  Phone, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Package, 
  Truck,
  Timer,
  RefreshCw,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { cn } from '../utility/cn';
import { Skeleton } from './Skeleton';

const OwnerOrderCard = ({ order, onStatusUpdate, onRebroadcast, onViewDetails }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [preparationTime, setPreparationTime] = useState(order.prepTime || 20);
    const [updatingStatus, setUpdatingStatus] = useState(null);

    const getNormalizedStatus = (status) => {
        if (!status) return 'NEW';
        const s = status.toUpperCase();
        if (s === 'PENDING') return 'NEW';
        if (s === 'PREPARING') return 'PREPARING';
        if (s === 'READY FOR PICKUP' || s === 'READY') return 'READY_FOR_PICKUP';
        if (s === 'OUT FOR DELIVERY' || s === 'OUTFORDELIVERY') return 'OUTFORDELIVERY';
        return s;
    };

    const normalizedStatus = getNormalizedStatus(order.status);
    const assignment = order.deliveryAssignment || null;
    const assignmentExpiresAt = assignment?.broadcastExpiresAt ? new Date(assignment.broadcastExpiresAt) : null;
    const isBroadcastActive = Boolean(
        assignment &&
        assignment.assignmentStatus === "unassigned" &&
        assignment.broadcastStatus === "active" &&
        assignmentExpiresAt &&
        assignmentExpiresAt > new Date()
    );
    const canRebroadcast = Boolean(
        normalizedStatus === 'READY_FOR_PICKUP' &&
        !order.deliveryPartner &&
        (
          !assignment ||
          (assignment.assignmentStatus === "unassigned" && !isBroadcastActive)
        )
    );
    const noDeliveryPartnerFound = Boolean(
        normalizedStatus === 'READY_FOR_PICKUP' &&
        !order.deliveryPartner &&
        assignment &&
        assignment.broadcastStatus === "failed"
    );

    const statusConfig = {
        NEW: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'New Order' },
        ACCEPTED: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Accepted' },
        PREPARING: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Preparing' },
        READY_FOR_PICKUP: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Ready' },
        OUTFORDELIVERY: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Out for Delivery' },
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

    // Status values must match backend ShopOrder status enum exactly
    const handleStatusChange = async (newStatus) => {
        let backendStatus = newStatus;
        // Map UI status to backend enum values (case-sensitive)
        if (newStatus === 'NEW') backendStatus = 'Pending';
        if (newStatus === 'ACCEPTED') backendStatus = 'Accepted'; 
        if (newStatus === 'PREPARING') backendStatus = 'Preparing'; 
        if (newStatus === 'READY_FOR_PICKUP') backendStatus = 'Ready';
        if (newStatus === 'OUTFORDELIVERY') backendStatus = 'OutForDelivery';
        
        setUpdatingStatus(newStatus);
        try {
            await onStatusUpdate({
                shopOrderId: order.shopOrderId,
                originalOrderId: order.originalOrderId,
                orderId: order.orderId
            }, backendStatus, preparationTime);
        } catch (error) {
            console.error("Status update failed", error);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleAccept = () => {
        handleStatusChange('ACCEPTED');
    };

    // FIXED: Use 'Cancelled' status and pass shopOrderId
    const handleReject = async () => {
        const reason = prompt('Rejection reason:');
        if (reason) {
            setUpdatingStatus('REJECTED');
            try {
                 await onStatusUpdate({
                    shopOrderId: order.shopOrderId,
                    originalOrderId: order.originalOrderId,
                    orderId: order.orderId
                 }, 'Cancelled', null, reason); 
            } catch (error) {
                 console.error("Rejection error:", error);
            } finally {
                 setUpdatingStatus(null);
            }
        }                                                                                   
    };

    const handleCancelBeforeDeliveryPartnerAssignment = async () => {
        if (!window.confirm("Cancel this order before delivery partner assignment?")) return;
        setUpdatingStatus('CANCELLED');
        try {
            await onStatusUpdate({
                shopOrderId: order.shopOrderId,
                originalOrderId: order.originalOrderId,
                orderId: order.orderId
            }, 'Cancelled', null, 'Cancelled by owner before delivery partner assignment');
        } catch (error) {
            console.error("Cancel (no delivery partner) failed", error);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const currentStatus = statusConfig[normalizedStatus] || statusConfig['NEW'];

    return (
        <div className={cn(
            "bg-white rounded-2xl shadow-md border-l-4 p-5 mb-6 hover:shadow-xl transition-all duration-300",
            currentStatus.border
        )}>
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">#{order.orderId}</h3>
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                            {currentStatus.label}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            <Clock size={14} className="text-gray-400" />
                            {getTimeElapsed(order.orderTime)}
                        </span>
                        <span className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
                            order.orderType === 'DELIVERY' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                        )}>
                            {order.orderType === 'DELIVERY' ? <Bike size={14} /> : <Store size={14} />}
                            {order.orderType}
                        </span>
                        <span className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
                            order.paymentMode === 'ONLINE' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-orange-600 bg-orange-50 border-orange-100'
                        )}>
                            <CreditCard size={14} />
                            {order.paymentMode === 'ONLINE' ? 'PAID' : 'COD'}
                        </span>
                    </div>
                </div>
                
                <div className="text-right">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">₹{order.totalAmount}</h2>
                    <div className="text-[10px] font-bold space-y-0.5 mt-1">
                        <p className="text-gray-400">Commission: -₹{order.commission || 0}</p>
                        <p className="text-emerald-600 uppercase tracking-tighter">Earnings: ₹{order.shopEarning || order.subtotal}</p>
                    </div>
                </div>
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 mb-4">
                <div className="flex flex-wrap gap-6 text-sm">
                    <span className="flex items-center gap-2 text-gray-800 font-bold">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <User size={14} className="text-orange-500" />
                        </div>
                        {order.customerName}
                    </span>
                    <span className="flex items-center gap-2 text-gray-600 font-bold">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <Phone size={14} className="text-blue-500" />
                        </div>
                        {order.customerPhone}
                    </span>
                </div>
                {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                    <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-start gap-2 text-xs font-medium text-gray-500">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-red-400" />
                        <span className="leading-relaxed italic">
                            {order.deliveryAddress.text || order.deliveryAddress}
                        </span>
                    </div>
                )}
            </div>

            {/*  UPDATED: Order Items with Images, Variants & Addons */}
            <div className="mb-3">
                <button 
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm mb-3 group"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
                        <ChevronDown size={18} />
                    </div>
                    {isExpanded ? `Hide Items (${order.items.length})` : `View Items (${order.items.length})`}
                </button>
                
                {isExpanded && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
                                
                                {/*  Item with Image */}
                                <div className="flex gap-4 mb-3">
                                    {/* Item Image */}
                                    <div className="flex-shrink-0">
                                        {item.image ? (
                                            <img 
                                                src={item.image} 
                                                alt={item.name}
                                                className="w-20 h-20 rounded-xl object-cover border border-gray-100 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-400">
                                                <Package size={24} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Item Details */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-gray-900 text-base">{item.name}</p>
                                                <p className="text-xs font-bold text-gray-400 mt-0.5">₹{item.price} × {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-lg text-[#ff4d2d]">₹{item.totalPrice || 0}</p>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">Qty: {item.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ✅ Variants */}
                                {item.variants && item.variants.length > 0 && (
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1.5 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            Variants
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {item.variants.map((variant, vidx) => (
                                                <span key={vidx} className="text-xs font-bold bg-white text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm">
                                                    {variant.name} {variant.price ? `(+₹${variant.price})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ✅ Addons */}
                                {item.addons && item.addons.length > 0 && (
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 mb-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1.5 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Add-ons
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {item.addons.map((addon, aidx) => (
                                                <span key={aidx} className="text-xs font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">
                                                    {addon.name} {addon.price ? `(+₹${addon.price})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ✅ Special Instructions */}
                                {item.specialInstructions && (
                                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-700 flex items-center gap-1.5 mb-1.5">
                                            <AlertCircle size={12} />
                                            Instructions
                                        </p>
                                        <p className="text-xs text-orange-800 font-medium italic bg-white/50 p-2 rounded-lg border border-orange-50">
                                            "{item.specialInstructions}"
                                        </p>
                                    </div>
                                )}

                            </div>
                        ))}
                        
                        {/* ✅ Order-level Special Instructions */}
                        {order.specialInstructions && (
                            <div className="bg-amber-50 border border-orange-100 rounded-2xl p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-2">
                                    <MoreHorizontal size={14} /> 
                                    Order Note
                                </p>
                                <p className="text-sm font-bold text-amber-900 leading-relaxed italic">"{order.specialInstructions}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                {normalizedStatus === 'NEW' && (
                    <>
                        <div className="flex items-center gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                                <Timer size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">Preparation Time</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <input 
                                        type="number" 
                                        value={preparationTime}
                                        onChange={(e) => setPreparationTime(e.target.value)}
                                        min="5"
                                        max="60"
                                        className="w-16 px-3 py-1.5 bg-white border border-orange-200 rounded-xl font-black text-[#ff4d2d] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none shadow-sm"
                                    />
                                    <span className="text-sm font-bold text-orange-800">Minutes</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                className="flex-1 bg-white border-2 border-red-100 text-red-500 font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                onClick={handleReject}
                                disabled={updatingStatus === 'REJECTED'}
                            >
                                {updatingStatus === 'REJECTED' ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        <XCircle size={18} />
                                        Reject
                                    </>
                                )}
                            </button>
                            <button 
                                className="flex-[2] bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                onClick={handleAccept}
                                disabled={updatingStatus === 'ACCEPTED'}
                            >
                                {updatingStatus === 'ACCEPTED' ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Accept Order
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}

                {normalizedStatus === 'ACCEPTED' && (
                    <button 
                        className="w-full bg-orange-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                        onClick={() => handleStatusChange('PREPARING')}
                        disabled={updatingStatus === 'PREPARING'}
                    >
                        {updatingStatus === 'PREPARING' ? <Loader2 size={20} className="animate-spin" /> : (
                            <>
                                <Store size={20} />
                                Start Preparing
                            </>
                        )}
                    </button>
                )}

                {normalizedStatus === 'PREPARING' && (
                    <button 
                        className="w-full bg-purple-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-lg shadow-purple-200 hover:bg-purple-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                        onClick={() => handleStatusChange('READY_FOR_PICKUP')}
                        disabled={updatingStatus === 'READY_FOR_PICKUP'}
                    >
                        {updatingStatus === 'READY_FOR_PICKUP' ? <Loader2 size={20} className="animate-spin" /> : (
                            <>
                                <CheckCircle2 size={20} />
                                Mark Ready for Pickup
                            </>
                        )}
                    </button>
                )}

                {normalizedStatus === 'READY_FOR_PICKUP' && (
                    <div className="space-y-4">
                        {/* ===== DELIVERY PARTNER NOT ASSIGNED ===== */}
                        {!order.deliveryPartner && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center shadow-sm">
                                <div className="flex justify-center mb-3">
                                    <div className="p-3 bg-white rounded-full shadow-sm">
                                        <RefreshCw size={24} className="text-amber-500 animate-spin" />
                                    </div>
                                </div>
                                <p className="text-sm font-black text-amber-900 uppercase tracking-tight">
                                    Finding Delivery Partner
                                </p>
                                <p className="text-xs font-bold text-amber-700/60 mt-1">
                                    {isBroadcastActive
                                        ? "Notifying nearby partners..."
                                        : noDeliveryPartnerFound
                                            ? "No nearby partners found yet"
                                            : "Request pending broadcast"}
                                </p>
                                <p className="text-xs font-bold text-amber-800 mt-2">
                                    {order.nearbyDeliveryPartnersCount > 0
                                        ? `Nearby delivery partners: ${order.nearbyDeliveryPartnersCount}`
                                        : order.nearbyDeliveryPartnersMessage}
                                </p>
                            </div>
                        )}

                        {order.deliveryPartner && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
                                        <Bike size={20} />
                                    </div>
                                    <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">
                                        Partner Assigned
                                    </p>
                                </div>

                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">
                                            {(order.deliveryPartner.fullName || order.deliveryPartner.name)?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 leading-tight">
                                                {order.deliveryPartner.fullName || order.deliveryPartner.name}
                                            </p>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
                                                On the way
                                            </p>
                                        </div>
                                    </div>
                                    <a href={`tel:${order.deliveryPartner.mobile}`} className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 hover:bg-emerald-100 transition shadow-sm border border-emerald-100">
                                        <Phone size={18} />
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-2">
                            {canRebroadcast && (
                                <button
                                    className="w-full bg-blue-500 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    onClick={() => onRebroadcast && onRebroadcast(order)}
                                >
                                    <RefreshCw size={16} />
                                    Re-broadcast Request
                                </button>
                            )}

                            {!order.deliveryPartner && (
                                <button
                                    className="w-full bg-white border-2 border-red-100 text-red-500 font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    onClick={handleCancelBeforeDeliveryPartnerAssignment}
                                    disabled={updatingStatus === 'CANCELLED'}
                                >
                                    {updatingStatus === 'CANCELLED' ? <Loader2 size={18} className="animate-spin" /> : (
                                        <>
                                            <XCircle size={18} />
                                            Cancel Order
                                        </>
                                    )}
                                </button>
                            )}

                            {/* ===== HANDOVER BUTTON ===== */}
                            <button 
                                className={cn(
                                    "w-full font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2",
                                    order.deliveryPartner 
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200"
                                )}
                                onClick={() => handleStatusChange('OUTFORDELIVERY')}
                                disabled={!order.deliveryPartner || updatingStatus === 'OUTFORDELIVERY'}
                            >
                                {updatingStatus === 'OUTFORDELIVERY' ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        <Package size={18} />
                                        Handed to Partner
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Secondary Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-50 mt-4">
                    <button 
                        className="flex-1 bg-gray-50 border border-gray-100 text-gray-600 font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5"
                        onClick={() => onViewDetails && onViewDetails(order.orderId)}
                    >
                        <MoreHorizontal size={14} />
                        Full Details
                    </button>
                    <button 
                        className="flex-1 bg-gray-50 border border-gray-100 text-gray-600 font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5"
                        onClick={() => window.print()}
                    >
                        <RefreshCw size={14} className="rotate-90" />
                        Print Bill
                    </button>
                </div>
            </div>

            {/* Timeline */}
            {normalizedStatus !== 'NEW' && normalizedStatus !== 'CANCELLED' && normalizedStatus !== 'REJECTED' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        {['Accepted', 'Preparing', 'Ready', 'Picked', 'Delivered'].map((step, idx) => {
                            const isCompleted = ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUTFORDELIVERY', 'DELIVERED'].indexOf(normalizedStatus) >= idx;
                            return (
                                <div key={step} className="flex flex-col items-center flex-1">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500",
                                        isCompleted ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-gray-100 text-gray-400"
                                    )}>
                                        {isCompleted ? <CheckCircle2 size={14} /> : idx + 1}
                                    </div>
                                    <span className={cn(
                                        "mt-2 text-[9px] font-black uppercase tracking-widest",
                                        isCompleted ? "text-emerald-600" : "text-gray-400"
                                    )}>{step}</span>
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
