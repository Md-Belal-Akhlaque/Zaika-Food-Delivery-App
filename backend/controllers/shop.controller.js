import { uploadOnCloudinary, deleteFromCloudinary } from "../utility/cloudinary.js";
import Shop from "../models/shopModel.js";
import Item from "../models/itemModel.js";

/*
  Shop Controller
  - createShop (POST /shop)             (owner)
  - editShop   (PUT  /shop/:shopId)     (owner)
  - getMyShop  (GET  /shop/me)          (owner)
  - getShopByCity (GET /shop/city/:city) (public)
  - getShopById   (GET /shop/:id)        (public)
  - toggleOpen    (PATCH /shop/:id/open) (owner)
  - toggleDelivery(PATCH /shop/:id/delivery) (owner)
  - deleteShop    (DELETE /shop/:id)     (owner) => soft delete
*/

/* -------------------------
   Helper: safe parse JSON fields
   (frontend may send variants/addons as JSON strings)
   ------------------------- */
const safeParseJSON = (value) => {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return undefined;
  }
};

/* ------------------------------------------------
   Create Shop (owner only)
   If owner already has shop -> return 409 or update depending on flow.
   Here we create a new shop if none exists.
   ------------------------------------------------ */
export const createShop = async (req, res) => {
  try {
    const { name, city, state, address, shopType, description, latitude, longitude, prepTime, deliveryTime } = req.body;
    const ownerId = req.userId;

    // Basic validation
    if (!name || !city || !state || !address) {
      return res.status(400).json({ success: false, message: "name, city, state and address are required" });
    }

    // If owner already has a shop, return 409 (or we could update)
    const existing = await Shop.findOne({ owner: ownerId, isActive: true });
    if (existing) {
      return res.status(409).json({ success: false, message: "Owner already has a shop. Use edit endpoint." });
    }

    // Upload image if present
    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      const result = await uploadOnCloudinary(req.file.path);
      imageUrl = result.secure_url || null;
      imagePublicId = result.public_id || null;
    }

    const shop = await Shop.create({
      name,
      city,
      state,
      address,
      image: imageUrl,
      imagePublicId,
      owner: ownerId,
      shopType: safeParseJSON(shopType) || (shopType ? [shopType] : []),
      description: description || "",
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      prepTime: prepTime ? Number(prepTime) : 15,
      deliveryTime: deliveryTime ? Number(deliveryTime) : 30
    });

    return res.status(201).json({ success: true, shop });
  } catch (error) {
    console.error("createShop error:", error);
    return res.status(500).json({ success: false, message: "Error creating shop", error: error.message });
  }
};

/* ------------------------------------------------
   Edit Shop (owner only)
   If image is replaced, delete old image from Cloudinary using public id
   ------------------------------------------------ */
export const editShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const ownerId = req.userId;

    // Find shop
    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) return res.status(404).json({ success: false, message: "Shop not found" });

    if (shop.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this shop" });
    }

    const updates = { ...req.body };

    // Parse shopType if sent as JSON string or CSV
    if (updates.shopType && typeof updates.shopType === "string") {
      // try JSON, else split by comma
      const parsed = safeParseJSON(updates.shopType);
      updates.shopType = parsed || updates.shopType.split(",").map(s => s.trim()).filter(Boolean);
    }

    // number conversions
    if (updates.latitude) updates.latitude = Number(updates.latitude);
    if (updates.longitude) updates.longitude = Number(updates.longitude);
    if (updates.prepTime) updates.prepTime = Number(updates.prepTime);
    if (updates.deliveryTime) updates.deliveryTime = Number(updates.deliveryTime);

    // Handle image replace
    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      const newImageUrl = uploadResult.secure_url || null;
      const newPublicId = uploadResult.public_id || null;

      // delete old image only if we have its public id
      if (shop.imagePublicId) {
        try {
          await deleteFromCloudinary(shop.imagePublicId);
        } catch (e) {
          console.warn("Could not delete old shop image from cloudinary:", e.message || e);
        }
      }

      updates.image = newImageUrl;
      updates.imagePublicId = newPublicId;
    }

    // Apply updates
    const updated = await Shop.findByIdAndUpdate(shopId, updates, { new: true });

    return res.status(200).json({ success: true, shop: updated });
  } catch (error) {
    console.error("editShop error:", error);
    return res.status(500).json({ success: false, message: "Error editing shop", error: error.message });
  }
};

/* ------------------------------------------------
   Get shop for logged-in owner
   ------------------------------------------------ */
export const getMyShop = async (req, res) => {
  try {
    const ownerId = req.userId;
    const shop = await Shop.findOne({ owner: ownerId, isActive: true })
      .populate({
        path: "items",
        select: "name price image rating ratingCount isAvailable isActive prepTime",
        options: { sort: { createdAt: -1 } }
      })
      .populate("owner", "fullName email");

    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    return res.status(200).json({ success: true, shop });
  } catch (error) {
    console.error("getMyShop error:", error);
    return res.status(500).json({ success: false, message: "Error fetching shop", error: error.message });
  }
};

/* ------------------------------------------------
   Get shops by city (public)
   returns light-weight items array
   ------------------------------------------------ */
export const getShopsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    if (!city) return res.status(400).json({ success: false, message: "City required" });

    const shops = await Shop.find({
      city: { $regex: new RegExp(city, "i") },
      isActive: true
    })
      .populate({
        path: "items",
        select: "name price image rating ratingCount isAvailable",
        options: { sort: { createdAt: -1 }, limit: 12 } // limit items per shop for list
      })
      .select("name city image rating ratingCount isOpen isDeliveryAvailable shopType");

    return res.status(200).json({ success: true, shops });
  } catch (error) {
    console.error("getShopsByCity error:", error);
    return res.status(500).json({ success: false, message: "Error fetching shops", error: error.message });
  }
};

/* ------------------------------------------------
   Get shop by ID (public)
   ------------------------------------------------ */
export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findById(id)
      .populate({
        path: "items",
        select: "name price image rating ratingCount isAvailable variants addons prepTime",
        options: { sort: { createdAt: -1 } }
      })
      .populate("owner", "fullName email");

    if (!shop || !shop.isActive) return res.status(404).json({ success: false, message: "Shop not found" });

    return res.status(200).json({ success: true, shop });
  } catch (error) {
    console.error("getShopById error:", error);
    return res.status(500).json({ success: false, message: "Error fetching shop", error: error.message });
  }
};

/* ------------------------------------------------
   Toggle isOpen (owner only)
   ------------------------------------------------ */
export const toggleOpen = async (req, res) => {
  try {
    const shopId = req.params.id;
    const ownerId = req.userId;

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) return res.status(404).json({ success: false, message: "Shop not found" });
    if (shop.owner.toString() !== ownerId.toString()) return res.status(403).json({ success: false, message: "Not authorized" });

    shop.isOpen = !shop.isOpen;
    await shop.save();

    return res.status(200).json({ success: true, isOpen: shop.isOpen });
  } catch (error) {
    console.error("toggleOpen error:", error);
    return res.status(500).json({ success: false, message: "Error toggling open state", error: error.message });
  }
};

/* ------------------------------------------------
   Toggle delivery availability (owner only)
   ------------------------------------------------ */
export const toggleDelivery = async (req, res) => {
  try {
    const shopId = req.params.id;
    const ownerId = req.userId;

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) return res.status(404).json({ success: false, message: "Shop not found" });
    if (shop.owner.toString() !== ownerId.toString()) return res.status(403).json({ success: false, message: "Not authorized" });

    shop.isDeliveryAvailable = !shop.isDeliveryAvailable;
    await shop.save();

    return res.status(200).json({ success: true, isDeliveryAvailable: shop.isDeliveryAvailable });
  } catch (error) {
    console.error("toggleDelivery error:", error);
    return res.status(500).json({ success: false, message: "Error toggling delivery availability", error: error.message });
  }
};

/* ------------------------------------------------
   Soft Delete Shop (owner only)
   - marks shop isActive = false
   - optionally mark items as inactive as well (we will do this)
   ------------------------------------------------ */
export const deleteShop = async (req, res) => {
  try {
    const shopId = req.params.id;
    const ownerId = req.userId;

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) return res.status(404).json({ success: false, message: "Shop not found" });
    if (shop.owner.toString() !== ownerId.toString()) return res.status(403).json({ success: false, message: "Not authorized" });

    // soft delete shop
    shop.isActive = false;
    await shop.save();

    // Mark all items of this shop inactive (soft delete items) - optional but recommended
    await Item.updateMany({ shop: shop._id }, { $set: { isActive: false, isAvailable: false } });

    // Try to delete shop image from cloudinary if we have public id
    if (shop.imagePublicId) {
      try {
        await deleteFromCloudinary(shop.imagePublicId);
      } catch (err) {
        console.warn("Could not delete shop image from cloudinary:", err.message || err);
      }
    }

    return res.status(200).json({ success: true, message: "Shop removed (soft delete) and items deactivated" });
  } catch (error) {
    console.error("deleteShop error:", error);
    return res.status(500).json({ success: false, message: "Error deleting shop", error: error.message });
  }
};
