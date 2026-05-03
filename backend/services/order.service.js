import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import ShopOrder from "../models/shopOrderModel.js";
import Item from "../models/itemModel.js";
import DeliveryAssignment from "../models/deliveryAssignmentModel.js";
import { enqueueBroadcast } from "../queue.js";

const BROADCAST_WINDOW_MS = 45 * 1000;

// Earning & Commission Constants

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));
const normalizeOptionKey = (value) => String(value || "").trim().toLowerCase();

/**
 * Commission slab (per shop order amount)
 * < 300  => 15%
 * >= 300 => 20%
 */
export const calculateCommission = (amount) => {
  const safeAmount = roundCurrency(amount);
  const commissionPercent = safeAmount < 300 ? 15 : 20;
  const commissionAmount = roundCurrency((safeAmount * commissionPercent) / 100);

  return {
    commissionPercent,
    commissionAmount
  };
};

/**
 * Canonical item pricing rule:
 * - If item has variants: variant overrides base price.
 * - Else use discountPrice || price as base.
 * - final = effectiveVariantOrBase + selectedAddons
 */
export const getFinalPrice = (item, { variants = [], addons = [] } = {}) => {
  const basePrice = roundCurrency(item?.discountPrice ?? item?.price);

  const variantNames = new Set(
    (Array.isArray(variants) ? variants : [])
      .map((variant) => normalizeOptionKey(variant?.name || variant?.title || variant?.label))
      .filter(Boolean)
  );

  const selectedVariants = (item?.variants || []).filter((variantInDb) =>
    variantNames.has(normalizeOptionKey(variantInDb?.name))
  );

  const itemHasVariants = Array.isArray(item?.variants) && item.variants.length > 0;

  if (itemHasVariants && selectedVariants.length === 0) {
    throw new Error(`Variant selection is required for item "${item?.name || item?._id}"`);
  }

  if (selectedVariants.length > 1) {
    throw new Error(`Only one variant can be selected for item "${item?.name || item?._id}"`);
  }

  const variantPrice = itemHasVariants
    ? roundCurrency(selectedVariants[0]?.price)
    : basePrice;

  const addonNames = new Set(
    (Array.isArray(addons) ? addons : [])
      .map((addon) => normalizeOptionKey(addon?.title || addon?.name || addon?.label))
      .filter(Boolean)
  );

  const selectedAddons = (item?.addons || []).filter((addonInDb) =>
    addonNames.has(normalizeOptionKey(addonInDb?.title))
  );

  const addonPrice = selectedAddons.reduce(
    (sum, addonInDb) => sum + roundCurrency(addonInDb?.price),
    0
  );

  return {
    finalUnitPrice: roundCurrency(variantPrice + addonPrice),
    selectedVariantsSnapshot: selectedVariants.map((variantInDb) => ({
      name: variantInDb.name,
      price: roundCurrency(variantInDb.price)
    })),
    selectedAddonsSnapshot: selectedAddons.map((addonInDb) => ({
      title: addonInDb.title,
      price: roundCurrency(addonInDb.price)
    }))
  };
};

export const calculateDeliveryFee = (itemsTotal) => {
  const safeItemsTotal = Number(itemsTotal || 0);
  if (safeItemsTotal > 500) {
    return { fee: 0, breakdown: "free" };
  }
  return { fee: 40, breakdown: null };
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

export const groupItemsByShop = async (cartItems, session = null) => {
  const normalizedItems = cartItems.map((item, index) => {
    const itemId =
      item?.itemId ||
      item?.id ||
      item?._id ||
      item?.item?._id ||
      item?.item?.id;

    if (!itemId) {
      throw new Error(`Invalid cart item at position ${index + 1}`);
    }

    const quantity = Number(item?.quantity || 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for item ${itemId}`);
    }

    return {
      ...item,
      itemId: itemId.toString(),
      quantity,
      variants: Array.isArray(item?.variants) ? item.variants : [],
      addons: Array.isArray(item?.addons) ? item.addons : []
    };
  });

  const ids = normalizedItems.map((i) => i.itemId);
  const uniqueIds = [...new Set(ids)];

  let query = Item.find({
    _id: { $in: uniqueIds },
    isActive: true,
    isAvailable: true
  }).populate("shop", "owner name address location");

  if (session) {
    query = query.session(session);
  }

  const dbItems = await query;

  if (dbItems.length !== uniqueIds.length) {
    throw new Error("One or more items are unavailable or do not exist");
  }

  const dbItemMap = new Map(dbItems.map((item) => [item._id.toString(), item]));
  const map = {};
  let itemsTotal = 0;

  for (const ci of normalizedItems) {
    const item = dbItemMap.get(ci.itemId.toString());
    if (!item) throw new Error("Item not found: " + ci.itemId);
    if (typeof item.stock === "number" && item.stock < ci.quantity) {
      throw new Error(`Insufficient stock for item "${item.name}"`);
    }

    // Canonical pricing from DB (frontend price is ignored):
    // If variant selected -> variant overrides base, then add add-ons.
    const {
      finalUnitPrice,
      selectedVariantsSnapshot,
      selectedAddonsSnapshot
    } = getFinalPrice(item, {
      variants: ci.variants,
      addons: ci.addons
    });

    if (!item?.shop?._id || !item?.shop?.owner) {
      throw new Error(`Item ${item._id} is not linked to an active shop`);
    }

    const shopId = item.shop._id.toString();

    if (!map[shopId]) {
      map[shopId] = {
        shop:     item.shop._id,
        owner:    item.shop.owner,
        shopDoc:  item.shop,
        subtotal: 0,
        items: []
      };
    }

    map[shopId].items.push({
      item:     item._id,
      name:     item.name,
      image:    item.image || null,
      price:    finalUnitPrice,
      prepTime: item.prepTime || 10,
      quantity: ci.quantity,
      variants: selectedVariantsSnapshot,
      addons:   selectedAddonsSnapshot
    });

    map[shopId].subtotal += Number((finalUnitPrice * ci.quantity).toFixed(2));
    itemsTotal            += Number((finalUnitPrice * ci.quantity).toFixed(2));
  }

  return {
    shopGroups: Object.values(map),
    itemsTotal: Number(itemsTotal.toFixed(2))
  };
};

const reserveStockForShopGroups = async (shopGroups = [], session = null) => {
  for (const group of shopGroups) {
    for (const line of group.items || []) {
      const quantity = Number(line.quantity || 0);
      if (!(quantity > 0)) continue;

      let reservedItem = await Item.findOneAndUpdate(
        {
          _id: line.item,
          stock: { $type: "number", $gte: quantity }
        },
        { $inc: { stock: -quantity } },
        { new: true, session }
      );

      // Unlimited stock items (legacy/no finite inventory) are allowed without decrement.
      if (!reservedItem) {
        const unlimitedItem = await Item.findOne(
          {
            _id: line.item,
            $or: [{ stock: null }, { stock: { $exists: false } }]
          },
          { _id: 1, isAvailable: 1, stock: 1 }
        ).session(session);

        if (unlimitedItem) {
          continue;
        }

        throw new Error(`Insufficient stock for item "${line.name || line.item}"`);
      }

      if (typeof reservedItem.stock === "number" && reservedItem.stock <= 0 && reservedItem.isAvailable) {
        await Item.updateOne(
          { _id: reservedItem._id },
          { $set: { isAvailable: false } },
          { session }
        );
      }
    }
  }
};

/**
 * CALCULATE ADAPTIVE ETA
 * UTILIZES: trafficFactor, riderSpeed, peakHourMultiplier, riderDelay
 */
export const calculateAdaptiveETA = (distance, shopPrepTime = 15) => {
  const now = new Date();
  const hour = now.getHours();

  // 1. Base Parameters
  const avgRiderSpeedKmH = 20; // Avg 20km/h in city
  const baseTravelTimeMin = (distance / avgRiderSpeedKmH) * 60;

  // 2. Traffic Factor (Based on hour of day)
  let trafficFactor = 1.0;
  if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20)) {
    trafficFactor = 1.5; // Peak hour congestion
  } else if (hour >= 12 && hour <= 14) {
    trafficFactor = 1.2; // Lunch rush
  }

  // 3. Peak Hour Multiplier (Kitchen load)
  let kitchenLoadMultiplier = 1.0;
  if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
    kitchenLoadMultiplier = 1.3; // Busy kitchen
  }

  // 4. Fixed Delays (Parking, handoff, signal)
  const riderDelay = 5; 

  const finalETA = Math.ceil(
    (shopPrepTime * kitchenLoadMultiplier) + 
    (baseTravelTimeMin * trafficFactor) + 
    riderDelay
  );

  return finalETA;
};

export const createAssignmentForShopOrder = async ({ shopOrder, order, shop }) => {
  const [shopLng, shopLat] = shop.location.coordinates;
  const customerLat = order.deliveryAddress?.latitude;
  const customerLng = order.deliveryAddress?.longitude;
  const distance = calculateDistance(shopLat, shopLng, customerLat, customerLng);

  // UTILIZES: Adaptive ETA logic
  // FIX: use max prepTime from items in shopOrder if available, fallback to shop.prepTime
  const maxItemPrepTime = Array.isArray(shopOrder.items) && shopOrder.items.length > 0
    ? Math.max(...shopOrder.items.map(i => i.prepTime || 0))
    : 0;
  
  const finalPrepTime = Math.max(maxItemPrepTime, shop.prepTime || 15);

  const eta = calculateAdaptiveETA(distance, finalPrepTime);

  const assignment = new DeliveryAssignment({
    order: order._id,
    shop: shop._id,
    shopOrder: shopOrder._id,
    pickupLocation: {
      type: "Point",
      coordinates: [shopLng, shopLat],
      address: shop.address,
      shopName: shop.name
    },
    dropoffLocation: {
      type: "Point",
      coordinates: [customerLng, customerLat],
      address: order.deliveryAddress?.text || "",
      customerName: order.user?.fullName || ""
    },
    deliveryDistance: distance,
    estimatedDeliveryTime: eta,
    broadcastStatus: "active",
    broadcastRound: 1,
    broadcastExpiresAt: new Date(Date.now() + BROADCAST_WINDOW_MS),
    assignmentStatus: "unassigned"
  });

  await assignment.save();
  return assignment;
};

// ── CHANGE 1: paymentMeta parameter added (default null) ──────────────────────
export const createOrderService = async ({ userId, cartItems, deliveryAddress, paymentMethod, idempotencyKey, paymentMeta = null }) => {
  const normalizedIdempotencyKey =
    typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";

  // ── CHANGE 2: paymentMethod now respected — "online" or "cod" ────────────────
  const normalizedPaymentMethod =
    paymentMethod === "online" ? "online" : "cod";

  if (!normalizedIdempotencyKey) {
    const err = new Error("Idempotency key is required");
    err.statusCode = 400;
    throw err;
  }

  // 1. Check if an order with this idempotencyKey already exists
  const existingOrder = await Order.findOne({ idempotencyKey: normalizedIdempotencyKey });
  if (existingOrder) {
    // SECURITY FIX: Ensure the user matches the existing order
    if (existingOrder.user.toString() !== userId.toString()) {
      const err = new Error("Idempotency key collision detected");
      err.statusCode = 409;
      throw err;
    }
    return existingOrder;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shopGroups, itemsTotal } = await groupItemsByShop(cartItems, session);
    await reserveStockForShopGroups(shopGroups, session);
    const { fee: deliveryFee, breakdown: deliveryFeeBreakdown } = calculateDeliveryFee(itemsTotal);
    const totalAmount = Number((itemsTotal + deliveryFee).toFixed(2));

    // Initialize aggregated totals
    let totalBaseAmount = 0;
    let totalCommission = 0;
    let totalDeliveryEarning = 0;
    let totalRiderEarning = 0;
    let totalShopEarning = 0;

    // First pass: Calculate financial breakdown for each shop group
    for (const group of shopGroups) {
      const subtotal = roundCurrency(group.subtotal);
      
      // 1. No tax component: base amount equals shop subtotal
      const baseAmount = subtotal;

      // 2. Commission is calculated per ShopOrder amount (multi-shop safe)
      const { commissionPercent, commissionAmount } = calculateCommission(subtotal);
      const commission = commissionAmount;

      // 3. Rider Earning: riderEarning = commission (NO minimum guarantee)
      const riderEarning = commission;

      // 4. Shop Earning: shopEarning = shopTotal - commission
      const shopEarning = roundCurrency(subtotal - commission);

      // Store in group for saving later
      group.financials = {
        totalAmount: subtotal,
        shopTotal: subtotal,
        baseAmount,
        commissionPercent,
        commissionAmount,
        commission,
        deliveryAmount: riderEarning,
        shopAmount: shopEarning,
        riderEarning,
        shopEarning
      };

      // Aggregate totals
      totalBaseAmount += baseAmount;
      totalCommission += commission;
      totalDeliveryEarning += riderEarning;
      totalRiderEarning += riderEarning;
      totalShopEarning += shopEarning;
    }

    // ── CHANGE 3: paymentStatus and paymentCapturedAt set based on paymentMeta ─
    const isOnlinePaid =
      normalizedPaymentMethod === "online" &&
      paymentMeta?.razorpayPaymentId;

    const order = new Order({
      user: userId,
      deliveryAddress,
      shopOrders: [],
      itemsTotal,
      deliveryFee,
      deliveryFeeBreakdown,
      totalAmount,
      // Financial aggregates
      totalBaseAmount,
      totalCommission,
      totalDeliveryEarning,
      totalRiderEarning,
      totalShopEarning,
      paymentMethod: normalizedPaymentMethod,               // "online" or "cod"
      paymentStatus: isOnlinePaid ? "Paid" : "Pending",    // Paid instantly for online
      paymentCapturedAt: isOnlinePaid ? new Date() : null, // Timestamp if paid
      paymentFailedAt: null,
      paymentFailureReason: null,
      stockReservedAt: null,
      stockReleaseAt: null,
      isStockReleased: false,
      orderStatus: "Pending",
      idempotencyKey: normalizedIdempotencyKey
    });
    await order.save({ session });

    const shopOrderIds = [];
    for (const group of shopGroups) {
      const shopOrder = new ShopOrder({
        order: order._id,
        shop: group.shop,
        owner: group.owner,
        items: group.items,
        subtotal: group.subtotal,
        // Save calculated financials
        totalAmount: group.financials.totalAmount,
        shopTotal: group.financials.shopTotal,
        baseAmount: group.financials.baseAmount,
        commissionPercent: group.financials.commissionPercent,
        commissionAmount: group.financials.commissionAmount,
        commission: group.financials.commission,
        deliveryAmount: group.financials.deliveryAmount,
        shopAmount: group.financials.shopAmount,
        riderEarning: group.financials.riderEarning,
        shopEarning: group.financials.shopEarning,
        status: "Pending"
      });
      await shopOrder.save({ session });
      shopOrderIds.push(shopOrder._id);
    }

    order.shopOrders = shopOrderIds;
    await order.save({ session });

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    // Handle duplicate key error manually in case of race conditions
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: normalizedIdempotencyKey, user: userId });
      if (existing) {
        return existing;
      }
      const collisionErr = new Error("Idempotency key collision detected");
      collisionErr.statusCode = 409;
      throw collisionErr;
    }
    throw error;
  } finally {
    session.endSession();
  }
};
