import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Item from "../models/itemModel.js";
import Shop from "../models/shopModel.js";
import User from "../models/userModel.js";
import DeliveryAssignment from "../models/deliveryAssignmentModel.js";

/* ------------------------------------------------
    HELPER: GROUP ITEMS BY SHOP
------------------------------------------------ */
const groupItemsByShop = async (cartItems) => {
  const ids = cartItems.map((i) => i.itemId);
  const items = await Item.find({ _id: { $in: ids } }).populate("shop", "owner");

  const map = {};
  let itemsTotal = 0;

  for (const ci of cartItems) {
    const item = items.find((i) => i._id.toString() === ci.itemId);

    if (!item) throw new Error("Item not found: " + ci.itemId);

    const q = Number(ci.quantity || 1);
    const price = Number(ci.price || item.price);
    const total = price * q;

    const shopId = item.shop._id.toString();

    if (!map[shopId]) {
      map[shopId] = {
        shop: shopId,
        owner: item.shop.owner.toString(),
        subtotal: 0,
        shopOrderItems: []
      };
    }

    map[shopId].shopOrderItems.push({
      name: item.name,
      item: item._id,
      price,
      quantity: q,
      variants: ci.variants || [],
      addons: ci.addons || []
    });

    map[shopId].subtotal += total;
    itemsTotal += total;
  }

  return {
    shopOrders: Object.values(map),
    itemsTotal
  };
};

/* ------------------------------------------------
    CREATE ORDER
------------------------------------------------ */
export const createOrder = async (req, res) => {
  try {
    const { cartItems, deliveryAddress, paymentMethod } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart empty" });
    }

    const userId = req.userId;

    // 1 Group items shop-wise
    const { shopOrders, itemsTotal } = await groupItemsByShop(cartItems);

    // 2 GLOBAL charges (ONCE)
    const deliveryFee = itemsTotal >= 500 ? 0 : 40;
    const platformFee = Number((itemsTotal * 0.02).toFixed(2)); // 2%

    // 3 GST (food + delivery)
    const gst = Number(((itemsTotal + deliveryFee) * 0.05).toFixed(2));

    // 4 Shop earnings
    shopOrders.forEach((so) => {
      const pf = Number((so.subtotal * 0.10).toFixed(2));
      so.platformFee = pf;
      so.earningsForShop = Number((so.subtotal - pf).toFixed(2));
    });

    // 5 FINAL amount
    const totalAmount = Number(
      (itemsTotal + deliveryFee + platformFee + gst).toFixed(2)
    );

    // 6 Create order
    const order = await Order.create({
      user: userId,
      deliveryAddress,

      itemsTotal,
      deliveryFee,
      platformFee,
      gst,
      totalAmount,

      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",

      shopOrders
    });

    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("ORDER_CREATE_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


/* ------------------------------------------------
    UPDATE SHOP ORDER STATUS
------------------------------------------------ */
export const updateShopOrderStatus = async (req, res) => {
  try {
    const { orderId, shopOrderId, status } = req.body;
    const ownerId = req.userId;

    const order = await Order.findById(orderId)
      .populate("user", "fullName name mobile")
      .populate("shopOrders.shop", "name");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const shopOrder = order.shopOrders.id(shopOrderId);
    
    if (!shopOrder) 
      return res.status(404).json({ success: false, message: "Shop order not found" });

    if (shopOrder.owner.toString() !== ownerId.toString())
      return res.status(403).json({ success: false, message: "Not authorized" });

    shopOrder.status = status;
    await order.save();

    //  BROADCAST WITH LOCATIONS
    if (status === "Ready") {
      try {
        const shopId = shopOrder.shop._id || shopOrder.shop;
        const shop = await Shop.findById(shopId);
        
        if (shop && shop.latitude && shop.longitude) {
          const nearbyRiders = await User.find({
            role: "deliveryPartner",
            isAvailable: true,
            location: {
              $near: {
                $geometry: {
                  type: "Point",
                  coordinates: [shop.longitude, shop.latitude]
                },
                $maxDistance: 5000
              }
            }
          });

          if (nearbyRiders.length > 0) {
            const riderIds = nearbyRiders.map(r => r._id);
            
            const existing = await DeliveryAssignment.findOne({ 
              shopOrderId: shopOrder._id 
            });
            
            if (!existing) {
              // FULL DATA WITH LOCATIONS
              await DeliveryAssignment.create({
                order: order._id,
                shop: shop._id,
                shopOrderId: shopOrder._id,
                
                // Broadcast data
                broadcastedTo: nearbyRiders.map(rider => ({
                  deliveryPartnerId: rider._id,
                  status: "sent",
                  sentAt: new Date(),
                  expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 mins
                })),
                broadcastStatus: "active",
                broadcastExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
                
                //  PICKUP LOCATION
                pickupLocation: {
                  shop: {
                    _id: shop._id,
                    name: shop.name,
                    latitude: shop.latitude,
                    longitude: shop.longitude,
                    address: shop.address || ""
                  }
                },
                
                //  DROPOFF LOCATION
                dropoffLocation: {
                  customer: {
                    _id: order.user._id,
                    name: order.user.fullName || order.user.name,
                    latitude: order.deliveryAddress.latitude,
                    longitude: order.deliveryAddress.longitude,
                    address: order.deliveryAddress.text
                  }
                },
                
                // Calculate distance (Haversine formula)
                deliveryDistance: calculateDistance(
                  shop.latitude,
                  shop.longitude,
                  order.deliveryAddress.latitude,
                  order.deliveryAddress.longitude
                ),
                estimatedDeliveryTime: 30
              });
              
              console.log(` Broadcasted order ${order._id} to ${riderIds.length} riders`);
            }
          } else {
            console.log(" No nearby riders found");
          }
        }
      } catch (broadcastErr) {
        console.error(" Broadcast Error:", broadcastErr);
      }
    }

    const updatedOrder = await Order.findById(orderId)
      .populate("user", "fullName name mobile")
      .populate("shopOrders.shop", "name")
      .populate("shopOrders.shopOrderItems.item");

    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error("UPDATE_STATUS_ERR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//  HELPER FUNCTION - Distance calculator
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(2); // km with 2 decimals
}


// FIXED: getMyOrders with deliveryPartner population
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "fullName name mobile")
      .populate("shopOrders.shop", "name")
      .populate("shopOrders.owner", "fullName name")
      .populate("shopOrders.shopOrderItems.item", "name image price")
      .populate("shopOrders.deliveryPartner", "fullName name mobile location"); // ✅ ADDED
    
    res.json({ success: true, orders });
  } catch (err) {
    console.error("GET_MY_ORDERS_ERR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// FIXED: getOwnerOrders with deliveryPartner population
export const getOwnerOrders = async (req, res) => {
  try {
    const ownerId = req.userId;
    if (!ownerId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const orders = await Order.find({ "shopOrders.owner": ownerId })
      .sort({ createdAt: -1 })
      .populate("user", "fullName name mobile")
      .populate("shopOrders.shop", "name")
      .populate("shopOrders.owner", "fullName name")
      .populate("shopOrders.shopOrderItems.item", "name image price")
      .populate("shopOrders.deliveryPartner", "fullName name mobile location"); // ✅ ADDED

    return res.json({ success: true, orders });
  } catch (err) {
    console.error("GET_OWNER_ORDERS_ERR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


