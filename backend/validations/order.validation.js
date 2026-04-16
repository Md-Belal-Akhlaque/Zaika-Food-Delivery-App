import { z } from "zod";

const cartItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  price: z.number().optional(), // We'll ignore this in controller but allow it in schema for now
  variants: z.array(z.any()).optional(),
  addons: z.array(z.any()).optional(),
});

export const createOrderSchema = z.object({
  cartItems: z.array(cartItemSchema).min(1, "Cart cannot be empty"),
  deliveryAddress: z.object({
    text: z.string().min(5, "Full address is required"),
    latitude: z.number(),
    longitude: z.number(),
    landmark: z.string().optional(),
  }),
  paymentMethod: z.enum(["cod", "online"]),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});

export const orderQuoteSchema = z.object({
  cartItems: z.array(cartItemSchema).min(1, "Cart cannot be empty"),
  deliveryAddress: z.object({
    text: z.string().min(5, "Full address is required"),
    latitude: z.number(),
    longitude: z.number(),
    landmark: z.string().optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  appOrderId: z.string().min(1, "App order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay signature is required"),
});

export const markPaymentFailedSchema = z.object({
  appOrderId: z.string().min(1, "App order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay order ID is required").optional(),
  reason: z.string().max(500, "Reason is too long").optional(),
});
