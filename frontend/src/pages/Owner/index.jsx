import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { serverURL } from "../config";
import { useSelector } from 'react-redux';
import { Edit2, Trash2, Eye, Lock, DollarSign, Clock } from 'lucide-react';
// import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { toast } from 'sonner';


const OwnerMenuList = () => {
  const navigate = useNavigate();
  const userData = useSelector(state => state.user.userData);
  
  const [shop, setShop] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, available, unavailable

  const colors = {
    primary: "#ff6b35",
    hover: "#e85d2b",
    bg: "#fff3e9",
    cardBg: "#ffffff",
    textDark: "#3b2f2f",
    gray: "#9ca3af",
    lightGray: "#f3f4f6",
  };

  useEffect(() => {
    fetchShopAndItems();
  }, []);

  const fetchShopAndItems = async () => {
    try {
      setLoading(true);

      // Get owner's shop
      const shopRes = await api.get(`//api/shop/me`
      //  , {
      //   withCredentials: true
      // }
      );
      
      if (!shopRes.data.shop) {
        toast.error("You don't have a shop yet. Please create one first.");
        navigate('/owner/create-shop');
        return;
      }
      
      setShop(shopRes.data.shop);
      
      // Fetch ALL items including unavailable ones
      const itemsRes = await api.get(`/api/item/menu/${shopRes.data.shop._id}`
        // ,
        // { withCredentials: true }
      );
      
      setItems(itemsRes.data.items || []);
      
    } catch (error) {
      console.error("Error fetching menu:", error);
      toast.error(error?.response?.data?.message || "Failed to load menu items");
      if (error.response?.status === 404) {
        navigate('/owner/create-shop');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (itemId, currentStatus) => {
    try {
      await api.patch(`/api/item/toggle-availability/${itemId}`,
        {}
        // ,
        // { withCredentials: true }
      );
      
      setItems(items.map(item => 
        item._id === itemId 
          ? { ...item, isAvailable: !currentStatus }
          : item
      ));
      
      toast.success(`Item marked as ${!currentStatus ? 'available' : 'unavailable'}`);
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/api/item/delete/${itemId}`
        // ,
        // { withCredentials: true }
      );
      
      setItems(items.filter(item => item._id !== itemId));
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'available') return item.isActive && item.isAvailable;
    if (filter === 'unavailable') return !item.isActive || !item.isAvailable;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your menu...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: colors.textDark }}>Manage Your Menu</h1>
              <p className="text-gray-600">{shop.name}</p>
            </div>
            <button
              onClick={() => navigate('/owner/add-item')}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-md"
            >
              + Add New Item
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Available ({items.filter(i => i.isActive && i.isAvailable).length})
            </button>
            <button
              onClick={() => setFilter('unavailable')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unavailable'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Unavailable ({items.filter(i => !i.isActive || !i.isAvailable).length})
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl text-gray-600">No items found</p>
            <button
              onClick={() => navigate('/owner/add-item')}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <OwnerItemCard
                key={item._id}
                item={item}
                colors={colors}
                onEdit={() => navigate(`/owner/edit-item/${item._id}`)}
                onDelete={() => handleDelete(item._id)}
                onToggleAvailability={() => handleToggleAvailability(item._id, item.isAvailable)}
                onViewMenu={() => navigate(`/shop/${shop._id}/menu`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Owner Item Card Component
const OwnerItemCard = ({ item, colors, onEdit, onDelete, onToggleAvailability, onViewMenu }) => {
  const isAvailable = item.isActive && item.isAvailable;
  
  return (
    <div
      className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${
        !isAvailable ? 'opacity-75' : ''
      }`}
    >
      <div className="relative h-48 w-full shrink-0 overflow-hidden bg-gray-100">
        <img
          src={item.image || '/placeholder-food.png'}
          alt={item.name}
          className={`w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`}
        />
        <div
          className={`pointer-events-none absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
            isAvailable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
          aria-hidden
        >
          {isAvailable ? 'Available' : 'Unavailable'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2" style={{ color: colors.textDark }}>
          {item.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
          {item.description || 'No description'}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            {item.discountPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">₹{item.discountPrice}</span>
                <span className="text-sm text-gray-400 line-through">₹{item.price}</span>
              </div>
            ) : (
              <span className="text-lg font-bold" style={{ color: colors.primary }}>
                ₹{item.price}
              </span>
            )}
          </div>
          
          {item.prepTime && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={14} />
              {item.prepTime} min
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onViewMenu}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            title="View in customer menu"
          >
            <Eye size={16} />
            View
          </button>
          
          <button
            onClick={onToggleAvailability}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              isAvailable
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={isAvailable ? 'Mark as unavailable' : 'Mark as available'}
          >
            <Lock size={16} />
            {isAvailable ? 'Disable' : 'Enable'}
          </button>
          
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
          >
            <Edit2 size={16} />
            Edit
          </button>
          
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerMenuList;
