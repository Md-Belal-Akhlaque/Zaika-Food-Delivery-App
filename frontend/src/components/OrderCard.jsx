// components/OrderCard.jsx - Fixed without date-fns dependency
import React from 'react';
import { Star, Clock, MapPin, Truck, CreditCard } from 'lucide-react';

const OrderCard = ({ order }) => {
  // Simple date formatter without date-fns
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'preparing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out for delivery': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">#{order.id}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{order.restaurant}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(order.date)}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4 mb-6">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">🍲</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
              </div>
              <p className="font-semibold text-gray-900">₹{item.total}</p>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Items:</span>
            <span>{order.items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Delivery:</span>
            <span>₹{order.deliveryFee}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-lg col-span-2">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{order.rating}/5</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>Delivered in 28 min</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl">
            Reorder
          </button>
          <button className="px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200">
            Track Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
