// CartItemCard.jsx
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaPlus, FaMinus, FaTrash } from 'react-icons/fa'
import { addToCartItem, decreaseCartItem } from '../redux/userSlice'
import './CartItemCard.css'

const CartItemCard = ({ item }) => {
  const dispatch = useDispatch()
  const id = item?.id ?? item?._id
  const current = useSelector((state) => state.user.cartItems.find((i) => i.id === id)) || item
  const image = current?.image || current?.imageUrl || (Array.isArray(current?.images) ? current.images[0] : undefined)
  const name = current?.name || current?.title || 'Item'
  const price = Number(current?.price || 0)
  const quantity = Number(current?.quantity || 0)
  const type = current?.foodType || current?.type || current?.category || 'Item'
  const stock = current?.stock || 10

  const handleIncrease = () => {
    if (!id) return
    dispatch(
      addToCartItem({
        id,
        name,
        price,
        image,
        foodType: current?.foodType,
        shop: current?.shop,
        category: current?.category,
        quantity: 1,
      })
    )
  }

  const handleDecrease = () => {
    if (!id || quantity <= 0) return
    dispatch(decreaseCartItem({ id, quantity: 1 }))
  }

  const handleDelete = () => {
    if (!id || quantity <= 0) return
    dispatch(decreaseCartItem({ id, quantity }))
  }

  const isLowStock = stock <= 3
  const isOutOfStock = stock <= 0

  return (
    <div className="cart-item-card">
      {/* Image Container */}
      <div className="item-image-wrapper">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="no-image">
            <i className="fas fa-image"></i>
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
              {quantity} × ₹{price} = <strong>₹{(quantity * price).toFixed(2)}</strong>
            </div>
        
            {/* <div className="item-type">{type}</div> */}
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

        {/* Controls Section */}
        <div className="item-controls">
          <div className="quantity-controls">
            <button
              onClick={handleDecrease}
              className="qty-btn"
              disabled={isOutOfStock}
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
  )
}

export default CartItemCard
