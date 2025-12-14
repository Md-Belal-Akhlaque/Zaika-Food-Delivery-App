// CartItemCard.jsx (patched)
import React from "react";
import { useDispatch } from "react-redux";
import { FaPlus, FaMinus, FaTrash } from "react-icons/fa";
import { addToCartItem, decreaseCartItem, removeCartItem } from "../redux/userSlice";
import "./CartItemCard.css";

const safeText = (v) => {
  // Return a friendly string for variant/addon values that might be objects
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  // object: try common fields
  return v.title ?? v.name ?? v.label ?? v._id ?? JSON.stringify(v);
};

const CartItemCard = ({ item }) => {
  const dispatch = useDispatch();

  // Use item prop directly — this component expects a normalized cart-item shape
  const current = item ?? {};
  const id = current.id || current._id;
  const cartId = current.cartId || current.cartId; // keep existing cartId if present

  const image =
    current?.image ||
    current?.imageUrl ||
    (Array.isArray(current?.images) ? current.images[0] : undefined);
  const name = current?.name || current?.title || "Item";
  const price = Number(current?.price || 0);
  const quantity = Number(current?.quantity || 0);
  const type = current?.foodType || current?.type || current?.category || "Item";
  const stock = Number(current?.stock ?? 10);

  // Normalize variants/addons into arrays of simple objects for safe rendering
  const variantsRaw = Array.isArray(current?.variants) ? current.variants : (current?.variants ? [current.variants] : []);
  const addonsRaw = Array.isArray(current?.addons) ? current.addons : (current?.addons ? [current.addons] : []);

  // Map to safe objects { id?, title?, price? } for reliable display
  const variants = variantsRaw.map((v) => {
    if (v == null) return null;
    if (typeof v === "string" || typeof v === "number") {
      return { _id: String(v), title: String(v), price: 0 };
    }
    return {
      _id: v._id ?? v.id ?? safeText(v),
      title: v.title ?? v.name ?? v.label ?? safeText(v),
      price: Number(v.price ?? 0),
    };
  }).filter(Boolean);

  const addons = addonsRaw.map((a) => {
    if (a == null) return null;
    if (typeof a === "string" || typeof a === "number") {
      return { _id: String(a), title: String(a), price: 0 };
    }
    return {
      _id: a._id ?? a.id ?? safeText(a),
      title: a.title ?? a.name ?? a.label ?? safeText(a),
      price: Number(a.price ?? 0),
    };
  }).filter(Boolean);

  const handleIncrease = () => {
    if (!id) return;
    dispatch(
      addToCartItem({
        id,
        cartId,
        name,
        price,
        image,
        foodType: current?.foodType,
        shop: current?.shop,
        category: current?.category,
        quantity: 1,
        variants: variants, // keep normalized shape
        addons: addons,
      })
    );
  };

  const handleDecrease = () => {
    if (!id || quantity <= 0) return;
    dispatch(decreaseCartItem({ id, cartId, quantity: 1 }));
  };

  const handleDelete = () => {
    if (!id) return;
    dispatch(removeCartItem({ id, cartId }));
  };

  const isLowStock = stock <= 3 && stock > 0;
  const isOutOfStock = stock <= 0;

  return (
    <div className="cart-item-card">
      {/* Image Container */}
      <div className="item-image-wrapper">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="no-image">
            <i className="fas fa-image" />
          </div>
        )}
        <div className="item-type-badge">{type}</div>
      </div>

      {/* Content Container */}
      <div className="item-content">
        {/* Header Section */}
        <div className="item-header">
          <div className="item-info">
            <h3 className="item-name">{name}</h3>

            <div className="item-qt-pr">
              {quantity} × ₹{price.toFixed(2)} ={" "}
              <strong>₹{(quantity * price).toFixed(2)}</strong>
            </div>

            {isOutOfStock ? (
              <div className="stock-badge out-of-stock">✗ Out of Stock</div>
            ) : isLowStock ? (
              <div className="stock-badge low-stock">⚠ Only {stock} left</div>
            ) : (
              <div className="stock-badge in-stock">✓ In Stock</div>
            )}
          </div>

          <span className="item-price">₹{(quantity * price).toFixed(2)}</span>
        </div>

        {/* Variants & Addons */}
        {(variants.length > 0 || addons.length > 0) && (
          <div className="text-xs text-gray-500 mt-1 mb-2 px-1">
            {variants.length > 0 && (
              <div className="mb-1">
                <span className="font-medium">Variant:</span>{" "}
                {variants.map((v, i) => (
                  <span key={v._id ?? `v-${i}`} className="block text-gray-600">
                    {v.title} {v.price ? <span className="text-sm text-gray-500"> (₹{v.price})</span> : null}
                  </span>
                ))}
              </div>
            )}

            {addons.length > 0 && (
              <div>
                <span className="font-medium">Addons:</span>
                {addons.map((a, i) => (
                  <span key={a._id ?? `a-${i}`} className="block text-gray-600">
                    {a.title} <span className="text-sm text-gray-500">(+₹{a.price || 0})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Controls Section */}
        <div className="item-controls">
          <div className="quantity-controls">
            <button
              onClick={handleDecrease}
              className="qty-btn"
              disabled={isOutOfStock || quantity <= 0}
              aria-label="Decrease quantity"
            >
              <FaMinus size={12} />
            </button>
            <span className="qty-display">{quantity}</span>
            <button
              onClick={handleIncrease}
              className="qty-btn"
              disabled={isOutOfStock}
              aria-label="Increase quantity"
            >
              <FaPlus size={12} />
            </button>
          </div>

          <button
            onClick={handleDelete}
            className="delete-btn"
            aria-label="Remove from cart"
            title="Remove from cart"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItemCard;
