import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverURL } from "../config";
import { ArrowLeft, Lock, DollarSign, Clock, Star, Ban, Bike, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import FoodCard from '../components/FoodCard';
import Navbar from '../components/Navbar';

const ShopMenuPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  
  const [shop, setShop] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShopAndItems();
  }, [shopId]);

  const fetchShopAndItems = async () => {
    try {
      setLoading(true);
      const itemsRes = await axios.get(`${serverURL}/api/item/menu/${shopId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      setItems(itemsRes.data.items || []);
      setShop(itemsRes.data.shop || null);
    } catch (error) {
      console.error("Error fetching shop/menu:", error);
      toast.error(error?.response?.data?.message || "Failed to load shop menu");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...new Set(items.map(item => item.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff3e9]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#ff4d2d] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff3e9]">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Shop not found</h2>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-[#ff4d2d] text-white rounded-xl font-bold hover:bg-[#e84224] transition shadow-lg shadow-orange-200"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden mt-16">
        <img 
          src={shop.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80'} 
          alt={shop.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12">
          <div className="max-w-7xl mx-auto w-full">
            <button
              onClick={() => navigate(-1)}
              className="absolute top-6 left-6 md:left-12 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition"
            >
              <ArrowLeft size={24} />
            </button>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{shop.name}</h1>
                <p className="text-white/80 text-lg flex items-center gap-2">
                  <Star size={18} fill="currentColor" className="text-yellow-400" />
                  <span className="font-bold">
                    {Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : 'New'}
                    {Number(shop.ratingCount || 0) > 0 ? ` (${Number(shop.ratingCount)})` : ''}
                  </span>
                  <span>•</span>
                  <span>{shop.address}</span>
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-white border border-white/20 flex flex-col items-center min-w-[100px]">
                  <Clock size={20} className="mb-1" />
                  <span className="text-xs uppercase font-bold opacity-80">Time</span>
                  <span className="font-black">{shop.deliveryTime || 30} min</span>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-white border border-white/20 flex flex-col items-center min-w-[100px]">
                  <DollarSign size={20} className="mb-1" />
                  <span className="text-xs uppercase font-bold opacity-80">Fee</span>
                  <span className="font-black">₹{shop.deliveryCharge || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Sticky Filter Bar */}
        <div className="sticky top-20 z-20 bg-gray-50/80 backdrop-blur-lg py-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search in menu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#ff4d2d] outline-none transition shadow-sm"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2.5 rounded-full whitespace-nowrap font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#ff4d2d] text-white shadow-lg shadow-orange-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-gray-900">
              {selectedCategory} <span className="text-[#ff4d2d]">Menu</span>
            </h2>
            <div className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold">
              {filteredItems.length} Items Found
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-gray-300">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800">No items match your criteria</h3>
              <p className="text-gray-500 mt-2">Try searching for something else or change category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map((item) => (
                <FoodCard 
                  key={item._id} 
                  data={{...item, shop: shop}} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopMenuPage;
