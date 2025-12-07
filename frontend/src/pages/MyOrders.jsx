// MyOrders.jsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import OrderCard from '../components/OrderCard';

const MyOrders = () => {
  const {userData,myOrders} = useSelector(state=>state.user);
  
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Sample data - replace with your API call
  useEffect(() => {
    const sampleOrders = [
      {
        id: 'ORD-1245',
        restaurant: 'Spice Haven',
        date: '2025-12-06T19:30:00',
        status: 'Delivered',
        rating: 4.8,
        items: [
          { name: 'Butter Chicken', price: 299, quantity: 1, total: 299, image: '/api/placeholder/64/64' },
          { name: 'Garlic Naan', price: 49, quantity: 2, total: 98, image: '/api/placeholder/64/64' }
        ],
        deliveryFee: 45,
        total: 442
      },
      {
        id: 'ORD-1244',
        restaurant: 'Burger Bonanza',
        date: '2025-12-05T21:15:00',
        status: 'Out for delivery',
        rating: 0,
        items: [
          { name: 'Classic Cheeseburger', price: 189, quantity: 2, total: 378, image: '/api/placeholder/64/64' }
        ],
        deliveryFee: 35,
        total: 413
      },
      {
        id: 'ORD-1243',
        restaurant: 'Pasta Palace',
        date: '2025-12-04T18:45:00',
        status: 'Delivered',
        rating: 4.2,
        items: [
          { name: 'Chicken Alfredo', price: 349, quantity: 1, total: 349, image: '/api/placeholder/64/64' }
        ],
        deliveryFee: 50,
        total: 399
      }
    ];
    setOrders(sampleOrders);
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status.toLowerCase() === filter;
    const matchesSearch = order.restaurant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'total') return b.total - a.total;
    return 0;
  });

  const statusFilters = [
    { id: 'all', label: 'All Orders', count: orders.length },
    { id: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'Delivered').length },
    { id: 'out for delivery', label: 'Out for Delivery', count: orders.filter(o => o.status === 'Out for delivery').length },
    { id: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'Preparing').length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              My Orders
            </h1>
            <p className="text-gray-600 mt-1">Track, reorder, and manage your recent orders</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Status Filters */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-lg">Filter by Status</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setFilter(status.id)}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    filter === status.id
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {status.label} ({status.count})
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sort */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders by restaurant or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <button className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl border border-gray-300 flex items-center justify-center gap-2 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200">
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === 'recent' ? 'Recent' : 'Total'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-6xl mx-auto space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-4L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your filters or search for specific restaurants and order IDs.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>

      {/* Pagination - Add when you have more orders */}
      {/* <div className="max-w-6xl mx-auto mt-12 flex items-center justify-between">
        <button className="p-3 rounded-2xl bg-white shadow-lg border hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-600">Page 1 of 3</span>
        <button className="p-3 rounded-2xl bg-white shadow-lg border hover:bg-gray-50 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div> */}
    </div>
  );
};

export default MyOrders;