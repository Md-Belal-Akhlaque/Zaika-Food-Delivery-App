const INR_SYMBOL = "\u20B9";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Number(toNumber(value).toFixed(2));

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const extractId = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value.id || value._id || value.value || value.name || value.title || "");
};

export const getShopName = (item = {}) =>
  item.shopName ||
  item.shop?.name ||
  item.shop?.title ||
  item.shop?.shopName ||
  "";

export const getShopId = (item = {}) =>
  String(
    item.shopId ||
      item.shop?._id ||
      item.shop?.id ||
      item.shop?.shopId ||
      "unknown-shop"
  );

export const normalizeVariant = (variant) => {
  if (variant == null) return null;
  if (typeof variant === "string" || typeof variant === "number") {
    const text = String(variant);
    return { id: text, name: text, price: 0 };
  }

  const id = extractId(variant);
  const name = String(variant.name || variant.title || variant.label || id || "Variant");

  return {
    id,
    name,
    price: round2(variant.price),
  };
};

export const normalizeAddon = (addon) => {
  if (addon == null) return null;
  if (typeof addon === "string" || typeof addon === "number") {
    const text = String(addon);
    return { id: text, name: text, price: 0 };
  }

  const id = extractId(addon);
  const name = String(addon.name || addon.title || addon.label || id || "Addon");

  return {
    id,
    name,
    price: round2(addon.price),
  };
};

export const normalizeVariantList = (variants) =>
  toList(variants).map(normalizeVariant).filter(Boolean);

export const normalizeAddonList = (addons) =>
  toList(addons).map(normalizeAddon).filter(Boolean);

export const getBasePrice = (item = {}) => {
  const discountPrice = item.discountPrice ?? item.discountedPrice;
  const basePrice = item.basePrice ?? item.price ?? item.item?.price;
  return round2(discountPrice ?? basePrice);
};

export const calculatePrice = ({
  basePrice = 0,
  discountPrice,
  variants = [],
  addons = [],
  selectedVariant = null,
  selectedAddons = [],
  quantity = 1,
} = {}) => {
  const normalizedVariants = normalizeVariantList(variants);
  const normalizedAddons = normalizeAddonList(addons);
  const normalizedSelectedVariant = selectedVariant ? normalizeVariant(selectedVariant) : null;
  const normalizedSelectedAddons = normalizeAddonList(selectedAddons);

  const hasVariants = normalizedVariants.length > 0;
  const effectiveBase = round2(discountPrice ?? basePrice);

  // Pricing rule:
  // If variants exist, ignore base and use selected variant price.
  const variantPrice = hasVariants
    ? round2(normalizedSelectedVariant?.price)
    : effectiveBase;

  const addonsTotal = round2(
    normalizedSelectedAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0)
  );

  const finalSinglePrice = round2(variantPrice + addonsTotal);
  const safeQty = Math.max(1, Math.floor(toNumber(quantity) || 1));
  const totalPrice = round2(finalSinglePrice * safeQty);

  return {
    variantPrice,
    addonsTotal,
    finalSinglePrice,
    totalPrice,
    quantity: safeQty,
    selectedVariant: normalizedSelectedVariant,
    selectedAddons: normalizedSelectedAddons,
    variants: normalizedVariants,
    addons: normalizedAddons,
  };
};

export const generateCartItemId = (itemId, selectedVariant = null, selectedAddons = []) => {
  const safeItemId = String(itemId || "").trim();
  const variant = selectedVariant ? normalizeVariant(selectedVariant) : null;
  const variantPart = variant?.id || variant?.name || "base";

  const addonIds = normalizeAddonList(selectedAddons)
    .map((addon) => addon.id || addon.name)
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));

  const addonsPart = addonIds.length > 0 ? addonIds.join(".") : "noaddon";
  return `${safeItemId}__${variantPart}__${addonsPart}`;
};

export const getCartItem = (cart, shopId, cartItemId) => {
  const shops = Array.isArray(cart?.shops) ? cart.shops : [];
  const shop = shops.find((s) => String(s.shopId) === String(shopId));
  if (!shop) return null;
  return (shop.items || []).find((item) => String(item.cartItemId) === String(cartItemId)) || null;
};

const buildPriceBreakdownFromCartItem = (item = {}) => {
  // Canonical path: use stored snapshot values (calculate once -> reuse everywhere).
  if (item.priceBreakdown?.finalSinglePrice != null) {
    return {
      variantPrice: round2(item.priceBreakdown.variantPrice),
      addonsTotal: round2(item.priceBreakdown.addonsTotal),
      finalSinglePrice: round2(item.priceBreakdown.finalSinglePrice),
    };
  }

  // Backward-compatible fallback for legacy cart entries without snapshot.
  const fallbackVariantPrice = round2(item.selectedVariant?.price ?? item.discountPrice ?? item.basePrice ?? item.price ?? 0);
  const fallbackAddonsTotal = round2(
    normalizeAddonList(item.selectedAddons || item.addons).reduce((sum, addon) => sum + addon.price, 0)
  );
  const finalSinglePrice = round2(fallbackVariantPrice + fallbackAddonsTotal);

  return {
    variantPrice: fallbackVariantPrice,
    addonsTotal: fallbackAddonsTotal,
    finalSinglePrice,
  };
};

export const buildCartItemSnapshot = (rawItem = {}, options = {}) => {
  const itemId = String(
    rawItem.itemId || rawItem.id || rawItem._id || rawItem.item?._id || rawItem.item?.id || ""
  );

  const shopId = getShopId(rawItem);
  const shopName = getShopName(rawItem) || "Shop";

  const variants = normalizeVariantList(rawItem.variants);
  const addons = normalizeAddonList(rawItem.addons);

  const selectedVariant = options.selectedVariant ?? rawItem.selectedVariant ?? null;
  const selectedAddons = options.selectedAddons ?? rawItem.selectedAddons ?? [];

  const pricing = calculatePrice({
    basePrice: rawItem.basePrice ?? rawItem.price,
    discountPrice: rawItem.discountPrice ?? rawItem.discountedPrice,
    variants,
    addons,
    selectedVariant,
    selectedAddons,
    quantity: options.quantity ?? rawItem.quantity ?? 1,
  });

  const cartItemId =
    options.cartItemId ||
    rawItem.cartItemId ||
    generateCartItemId(itemId, pricing.selectedVariant, pricing.selectedAddons);

  return {
    cartItemId,
    itemId,
    name: rawItem.name || rawItem.title || rawItem.item?.name || "Item",
    image:
      rawItem.image ||
      rawItem.imageUrl ||
      rawItem.item?.image ||
      (Array.isArray(rawItem.images) ? rawItem.images[0] : ""),
    basePrice: round2(rawItem.basePrice ?? rawItem.price),
    discountPrice: round2(rawItem.discountPrice ?? rawItem.discountedPrice ?? rawItem.basePrice ?? rawItem.price),
    selectedVariant: pricing.selectedVariant,
    selectedAddons: pricing.selectedAddons,
    quantity: pricing.quantity,
    priceBreakdown: {
      variantPrice: pricing.variantPrice,
      addonsTotal: pricing.addonsTotal,
      finalSinglePrice: pricing.finalSinglePrice,
    },
    totalPrice: pricing.totalPrice,
    shopId,
    shopName,
    foodType: rawItem.foodType || rawItem.type || rawItem.category || "",
  };
};

export const calculateShopSubtotal = (shop = {}) =>
  round2((shop.items || []).reduce((sum, item) => sum + toNumber(item.totalPrice), 0));

export const calculateCartTotals = (shops = []) => {
  const safeShops = Array.isArray(shops) ? shops : [];

  const nextShops = safeShops
    .map((shop) => {
      const items = Array.isArray(shop.items) ? shop.items : [];
      const normalizedItems = items
        .map((item) => {
          const quantity = Math.max(1, Math.floor(toNumber(item.quantity) || 1));
          const priceBreakdown = buildPriceBreakdownFromCartItem(item);
          return {
            ...item,
            quantity,
            priceBreakdown,
            totalPrice: round2(priceBreakdown.finalSinglePrice * quantity),
          };
        })
        .filter((item) => item.itemId || item.cartItemId);

      const shopSubtotal = round2(
        normalizedItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)
      );

      return {
        shopId: String(shop.shopId || "unknown-shop"),
        shopName: shop.shopName || "Shop",
        items: normalizedItems,
        shopSubtotal,
      };
    })
    .filter((shop) => shop.items.length > 0);

  const grandTotal = round2(
    nextShops.reduce((sum, shop) => sum + toNumber(shop.shopSubtotal), 0)
  );

  const quantityTotal = nextShops.reduce(
    (sum, shop) => sum + shop.items.reduce((inner, item) => inner + Math.max(1, toNumber(item.quantity)), 0),
    0
  );

  const itemCount = nextShops.reduce((sum, shop) => sum + shop.items.length, 0);

  return {
    shops: nextShops,
    grandTotal,
    quantityTotal,
    itemCount,
  };
};

export const flattenCartShops = (cart = {}) => {
  const shops = Array.isArray(cart.shops) ? cart.shops : [];
  const result = [];

  for (const shop of shops) {
    for (const item of shop.items || []) {
      result.push({
        ...item,
        shopId: shop.shopId,
        shopName: shop.shopName,
      });
    }
  }

  return result;
};

export const buildCartFromLegacyItems = (legacyItems = []) => {
  const safeItems = Array.isArray(legacyItems) ? legacyItems : [];
  const grouped = new Map();

  for (const legacyItem of safeItems) {
    const shopId = getShopId(legacyItem);
    const shopName = getShopName(legacyItem) || "Shop";

    const selectedVariant = legacyItem.selectedVariant || (Array.isArray(legacyItem.variants) ? legacyItem.variants[0] : null);
    const selectedAddons = legacyItem.selectedAddons || legacyItem.addons || [];

    const snapshot = buildCartItemSnapshot(
      {
        ...legacyItem,
        variants: legacyItem.variants || (selectedVariant ? [selectedVariant] : []),
        addons: legacyItem.addons || selectedAddons,
      },
      {
        selectedVariant,
        selectedAddons,
        quantity: legacyItem.quantity ?? 1,
        cartItemId: legacyItem.cartItemId || legacyItem.cartId,
      }
    );

    if (!grouped.has(shopId)) {
      grouped.set(shopId, {
        shopId,
        shopName,
        items: [],
      });
    }

    grouped.get(shopId).items.push(snapshot);
  }

  return calculateCartTotals(Array.from(grouped.values()));
};

// -------------------- Backward-compatible exports --------------------

export const getOptionLabel = (option) => {
  if (option == null) return "";
  if (typeof option === "string" || typeof option === "number") return String(option);
  return option.name || option.title || option.label || "";
};

export const getOptionPrice = (option) => {
  if (option == null || typeof option === "string" || typeof option === "number") return 0;
  return round2(option.price);
};

export const normalizeOptions = (rawOptions = []) =>
  toList(rawOptions)
    .map((option) => ({
      label: getOptionLabel(option),
      price: getOptionPrice(option),
    }))
    .filter((option) => option.label);

export const getFinalPrice = (item = {}) => {
  if (item.priceBreakdown?.finalSinglePrice != null) {
    return round2(item.priceBreakdown.finalSinglePrice);
  }

  const selectedVariant = item.selectedVariant || (Array.isArray(item.variants) && item.variants.length === 1 ? item.variants[0] : null);
  const selectedAddons = item.selectedAddons || item.addons || [];

  const result = calculatePrice({
    basePrice: item.basePrice ?? item.price ?? item.item?.price,
    discountPrice: item.discountPrice ?? item.discountedPrice,
    variants: item.variants || [],
    addons: item.addons || [],
    selectedVariant,
    selectedAddons,
    quantity: 1,
  });

  return round2(result.finalSinglePrice);
};

export const getItemUnitPrice = (item) => getFinalPrice(item);

export const getItemQuantity = (item) => Math.max(1, Math.floor(toNumber(item?.quantity || 1)));

export const getItemLineTotal = (item) => round2(getItemUnitPrice(item) * getItemQuantity(item));

export const calculateCartSummary = (cartItems = []) => {
  const safeItems = Array.isArray(cartItems) ? cartItems : [];
  const itemsTotal = safeItems.reduce((sum, item) => sum + getItemLineTotal(item), 0);
  const quantityTotal = safeItems.reduce((sum, item) => sum + getItemQuantity(item), 0);

  return {
    itemCount: safeItems.length,
    quantityTotal,
    itemsTotal: round2(itemsTotal),
  };
};

export const formatINR = (value) => `${INR_SYMBOL}${round2(value).toFixed(2)}`;

export { INR_SYMBOL, round2, toNumber };
