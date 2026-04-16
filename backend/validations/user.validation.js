import { z } from "zod";

export const saveAddressSchema = z.object({
  address: z.object({
    id: z.string().optional(),
    label: z.string().min(1, "Label is required"),
    address: z.string().min(5, "Full address is required"),
    pincode: z.string().regex(/^\d{6}$/, "Invalid pincode (must be 6 digits)"),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180)
    }).optional(),
    extraDetails: z.string().optional(),
    isDefault: z.boolean().optional()
  })
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is too short").optional(),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits").optional()
});

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180)
});
