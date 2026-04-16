import React from "react";
import { useDispatch } from "react-redux";
import { Plus, Minus, Trash2, AlertCircle } from "lucide-react";
import { removeCartItem, updateCartItemQty } from "../redux/cartSlice";
import { cn } from "../utility/cn";
import { formatINR, normalizeAddonList, normalizeVariant } from "../utility/cartPricing";
import "./CartItemCard.css";

const CartItemCard = ({ item, shopId }) => {
  const dispatch = useDispatch();

  const current = item || {};
  const cartItemId = current.cartItemId;
  const image = current.image || "";
  const name = current.name || "Item";
  const quantity = Number(current.quantity || 1);
  const unitPrice = Number(current.priceBreakdown?.finalSinglePrice || 0);
  const lineTotal = Number(current.totalPrice || unitPrice * quantity);
  const foodType = current.foodType || "Item";

  const selectedVariant = normalizeVariant(current.selectedVariant);
  const selectedAddons = normalizeAddonList(current.selectedAddons);

  const handleIncrease = () => {
    dispatch(updateCartItemQty({ shopId, cartItemId, delta: 1 }));
  };

  const handleDecrease = () => {
    dispatch(updateCartItemQty({ shopId, cartItemId, delta: -1 }));
  };

  const handleDelete = () => {
    dispatch(removeCartItem({ shopId, cartItemId }));
  };

  const stock = Number(current.stock ?? 10);
  const isLowStock = stock <= 3 && stock > 0;

  return (
    <div className="cart-item-card">
      <div className="item-image-wrapper">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="no-image">
            <i className="fas fa-image" />
          </div>
        )}
        <div className="item-type-badge">{foodType}</div>
      </div>

      <div className="item-details-container">
        <div className="item-header-row">
          <div className="item-name-group">
            <h3 className="item-name">{name}</h3>
            {foodType && <span className={cn("item-type-badge", String(foodType).toLowerCase())}>{foodType}</span>}
          </div>
          <button className="item-remove-btn" onClick={handleDelete} title="Remove Item">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="item-customizations">
          {selectedVariant && (
            <div className="customization-tag variation">Variant: {selectedVariant.name}</div>
          )}
          {selectedAddons.length > 0 && (
            <div className="customization-tag addon">
              Add-ons: {selectedAddons.map((addon) => addon.name).join(", ")}
            </div>
          )}
        </div>

        <div className="item-footer-row">
          <div className="item-price-wrapper">
            <span className="price-label">Price:</span>
            <span className="item-price">{formatINR(unitPrice)}</span>
            <span className="total-item-price">Total: {formatINR(lineTotal)}</span>
          </div>

          <div className="quantity-controls-wrapper">
            <button className="qty-btn decrease" onClick={handleDecrease}>
              <Minus size={14} />
            </button>
            <span className="qty-value">{quantity}</span>
            <button className="qty-btn increase" onClick={handleIncrease}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {isLowStock && (
          <div className="stock-warning flex items-center gap-1">
            <AlertCircle size={12} />
            Only {stock} left!
          </div>
        )}
      </div>
    </div>
  );
};

export default CartItemCard;
