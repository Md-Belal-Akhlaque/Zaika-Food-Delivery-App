import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, ChevronLeft, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { serverURL } from '../App';
import Swal from 'sweetalert2';

const RateOrder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { order } = location.state || {};
  
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(false);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Order not found</h2>
          <button 
            onClick={() => navigate('/my-orders')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleRatingChange = (itemId, rating) => {
    setRatings(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], rating }
    }));
  };

  const handleReviewChange = (itemId, review) => {
    setRatings(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], review }
    }));
  };

  const handleSubmit = async () => {
    const itemsToRate = order.items.filter(item => ratings[item.id]?.rating > 0);
    
    if (itemsToRate.length === 0) {
      Swal.fire('Info', 'Please rate at least one item', 'info');
      return;
    }

    setLoading(true);
    try {
      const promises = itemsToRate.map(item => {
        const itemRating = ratings[item.id];
        return axios.post(`${serverURL}/api/rating/add`, {
          itemId: item.id,
          shopId: order.shopId,
          rating: itemRating.rating,
          review: itemRating.review
        }, { withCredentials: true });
      });

      await Promise.all(promises);
      
      Swal.fire({
        title: 'Thank You!',
        text: 'Your feedback helps us improve.',
        icon: 'success',
        confirmButtonColor: '#f97316'
      }).then(() => {
        navigate('/my-orders');
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to submit ratings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rate Your Order</h1>
            <p className="text-gray-500">{order.restaurant} • {new Date(order.date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-6">
          {order.items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex gap-4">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-gray-500 text-sm">₹{item.price}</p>
                  
                  {/* Star Rating */}
                  <div className="flex items-center gap-2 mt-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(item.id, star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-8 h-8 ${
                            (ratings[item.id]?.rating || 0) >= star 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-600">
                      {ratings[item.id]?.rating ? `${ratings[item.id].rating}/5` : 'Rate this item'}
                    </span>
                  </div>

                  {/* Review Textarea */}
                  <div className="mt-4">
                    <textarea
                      placeholder="Write a review (optional)..."
                      value={ratings[item.id]?.review || ''}
                      onChange={(e) => handleReviewChange(item.id, e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Reviews'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateOrder;
