import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { serverURL } from '../config';
import Swal from 'sweetalert2';

const RateOrder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { order } = location.state || {};

  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(false);

  const itemsForRating = useMemo(() => {
    if (!order) return [];

    if (Array.isArray(order.shops) && order.shops.length > 0) {
      return order.shops.flatMap((shop, shopIndex) =>
        (shop.items || []).map((item, itemIndex) => {
          const itemId =
            item.id ||
            item.itemId ||
            item?._id ||
            item?.item?._id ||
            `${shopIndex}-${itemIndex}`;
          const shopId = item.shopId || shop.shopId || order.shopId || null;

          return {
            ...item,
            id: itemId,
            shopId,
            shopName: item.shopName || shop.shopName || '',
            image: item.image || item?.item?.image || '',
            rateKey: `${itemId}-${shopId || shopIndex}`,
          };
        })
      );
    }

    return (order.items || []).map((item, index) => {
      const itemId =
        item.id ||
        item.itemId ||
        item?._id ||
        item?.item?._id ||
        `item-${index}`;
      const shopId = item.shopId || order.shopId || null;

      return {
        ...item,
        id: itemId,
        shopId,
        shopName: item.shopName || order.restaurant || order.shopName || '',
        image: item.image || item?.item?.image || '',
        rateKey: `${itemId}-${shopId || index}`,
      };
    });
  }, [order]);

  const orderLabel = useMemo(() => {
    if (!order) return '';
    if (order.restaurant) return order.restaurant;
    if (order.shopName) return order.shopName;

    if (Array.isArray(order.shops) && order.shops.length > 0) {
      return order.shops
        .map((shop) => shop.shopName)
        .filter(Boolean)
        .join(', ');
    }

    return 'Your Order';
  }, [order]);

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

  const handleRatingChange = (itemKey, rating) => {
    setRatings((prev) => ({
      ...prev,
      [itemKey]: { ...prev[itemKey], rating },
    }));
  };

  const handleReviewChange = (itemKey, review) => {
    setRatings((prev) => ({
      ...prev,
      [itemKey]: { ...prev[itemKey], review },
    }));
  };

  const handleSubmit = async () => {
    const selectedItems = itemsForRating.filter((item) => ratings[item.rateKey]?.rating > 0);
    const invalidItems = selectedItems.filter((item) => !item.id || !item.shopId);

    if (selectedItems.length === 0) {
      Swal.fire('Info', 'Please rate at least one item', 'info');
      return;
    }

    if (invalidItems.length > 0) {
      Swal.fire('Error', 'Some items are missing shop details and cannot be rated.', 'error');
      return;
    }

    setLoading(true);
    try {
      const promises = selectedItems.map((item) => {
        const itemRating = ratings[item.rateKey];

        return axios.post(
          `${serverURL}/api/rating/add`,
          {
            itemId: item.id,
            shopId: item.shopId,
            rating: itemRating.rating,
            review: itemRating.review,
          },
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`
            }
          }
        );
      });

      await Promise.all(promises);

      Swal.fire({
        title: 'Thank You!',
        text: 'Your feedback helps us improve.',
        icon: 'success',
        confirmButtonColor: '#f97316',
      }).then(() => {
        navigate('/my-orders');
      });
    } catch (error) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to submit ratings';
      Swal.fire('Error', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rate Your Order</h1>
            <p className="text-gray-500">
              {orderLabel} - {new Date(order.date || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {itemsForRating.map((item) => (
            <div key={item.rateKey} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex gap-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-semibold">
                    No Image
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-gray-500 text-sm">Rs. {item.price}</p>
                  {item.quantity > 0 && (
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  )}
                  {item.shopName && (
                    <p className="text-xs text-gray-500">Shop: {item.shopName}</p>
                  )}
                  {(item.selectedVariant?.name || item.variants?.[0]?.name || item.variants?.[0]?.title) && (
                    <p className="text-xs text-gray-500">
                      Variant: {item.selectedVariant?.name || item.variants?.[0]?.name || item.variants?.[0]?.title}
                    </p>
                  )}
                  {(item.selectedAddons || item.addons || []).length > 0 && (
                    <p className="text-xs text-gray-500">
                      Add-ons: {(item.selectedAddons || item.addons || [])
                        .map((addon) => addon?.name || addon?.title)
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(item.rateKey, star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${(ratings[item.rateKey]?.rating || 0) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-600">
                      {ratings[item.rateKey]?.rating ? `${ratings[item.rateKey].rating}/5` : 'Rate this item'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <textarea
                      placeholder="Write a review (optional)..."
                      value={ratings[item.rateKey]?.review || ''}
                      onChange={(e) => handleReviewChange(item.rateKey, e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none text-sm"
                      rows="2"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
          >
            {loading ? 'Submitting...' : 'Submit Reviews'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateOrder;
