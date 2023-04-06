import Joi from "joi";
import {
  Product,
  ProductDoc,
  ProductPrice,
  ProductAddons,
  ProductVariant,
  VariantItem,
  AddonItem,
  TimelineItem,
} from "../../model/product";
import { Restaurant, RestaurantDoc } from "../../model/restaurant";
import { Hub, HubDoc } from "../../model/hub";
import { HubArea, HubAreaDoc } from "../../model/hubArea";
import {
  betweenHours,
  errorRes,
  ErrorResponse,
  successRes,
  isErrorResponse,
  isSuccessResponse,
} from "../../utils";
import { PromoDoc, Promo } from "../../model/promo";
import {
  Order,
  OrderDoc,
  OrderPromo,
  OrderPickup,
  OrderItem,
  OrderVariant,
  OrderAddon,
  PickupItem,
} from "../../model/order";
import { randomBytes, createHash } from "crypto";

export const orderItemsSchema = Joi.object({
  id: Joi.string(),
  name: Joi.string().optional(),
  variant: Joi.array()
    .items(
      Joi.object().keys({
        variantId: Joi.string().required(),
        items: Joi.array()
          .items(
            Joi.object().keys({
              id: Joi.string().required(),
              name: Joi.string().optional(),
            })
          )
          .required(),
      })
    )
    .optional()
    .allow(null),
  addons: Joi.array()
    .items(
      Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().optional(),
      })
    )
    .optional()
    .allow(null),
  quantity: Joi.number().min(1),
});

export const orderSchema = Joi.object<OrderBodyParams>({
  customer_name: Joi.string(),
  customer_address: Joi.string(),
  customer_phone: Joi.string(),
  customer_area: Joi.string(),
  order_items: Joi.array().items(orderItemsSchema).min(1).required(),
  paymentMethod: Joi.string().valid("cod", "online", "bkash").required(),
  temp_order: Joi.string().optional(),
  payments: Joi.array().optional(),
  payment_status: Joi.string().valid("paid").optional(),
  promo: Joi.string().optional().allow(null, ""),
  promoAuth: Joi.when("promo", {
    is: Joi.exist(),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  note: Joi.string().optional().allow("", null),
  rider_note: Joi.string().optional().allow("", null),
  platform: Joi.string()
    .optional()
    .valid("app", "web", "social_media", "custom"),
  lat: Joi.string().optional().allow("", null),
  lng: Joi.string().optional().allow("", null),
  by_manager: Joi.boolean().optional(),
  dispatchHour: Joi.object({
    h: Joi.number().optional(),
    text: Joi.string().optional(),
  })
    .optional()
    .allow(null),
}).options({ abortEarly: false, presence: "required" });

export interface ReqOrderItem {
  id: string;
  quantity: number;
  variant: {
    variantId: string;
    items: {
      id: string;
    }[];
  }[];
  addons: {
    id: string;
  }[];
}

interface OrderBodyParams {
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_area: string;
  order_items: ReqOrderItem[];
  paymentMethod: "cod" | "online" | "bkash";
  temp_order?: string;
  payments?: any[];
  payment_status?: "paid";
  promo?: string;
  promoAuth?: string;
  note?: string;
  rider_note?: string;
  platform?: "app" | "web" | "social_media" | "custom";
  lat?: string;
  lng?: string;
  by_manager?: boolean;
  dispatchHour?: {
    h: number;
    text: string;
  };
}

const processValidationError = (er) => {
  return er.details.map((i) => i.message).join(", ");
};

export const orderSchemaValidator = (
  params: OrderBodyParams
): OrderBodyParams => {
  const { error, value } = orderSchema.validate(params);
  if (error) {
    errorRes(400, processValidationError(error));
  }

  return value;
};

export const productsByIds = async (ids: string[]): Promise<ProductDoc[]> => {
  const products = await Product.find({ _id: { $in: ids } }).select(
    "_id name availability _p_category _p_restaurant name stock price inventory"
  );
  return products;
};

/**
 * Check Is there any item missing or not
 * Check inventory status
 */
export const checkProductStatus = (
  orderItems: ReqOrderItem[],
  products: ProductDoc[]
): void => {
  // Check Is there any item missing or not
  if (orderItems.length !== products.length) {
    const orderItemsGroup: { [key: string]: number } = orderItems.reduce(
      (acc, item) => {
        if (acc[item.id]) acc[item.id]++;
        else acc[item.id] = 1;
        return acc;
      },
      {}
    );

    const totalItems = Object.values(orderItemsGroup).reduce(
      (acc: number, item: number) => acc + item,
      0
    );

    if (totalItems !== orderItems.length) {
      errorRes(404, "Order item not found!");
    }
  }

  // Check inventory status
  const quantityById: { [key: string]: number } = orderItems.reduce(
    (acc, cur) => {
      if (!acc[cur.id]) {
        acc[cur.id] = cur.quantity;
      } else {
        acc[cur.id] += cur.quantity;
      }
      return acc;
    },
    {}
  );

  const limitedItem = products.find((p) => {
    return p.is_inv && (p.stock ?? 0) < quantityById[p.id];
  });

  if (limitedItem) {
    let limitedStock = limitedItem.stock ?? 0;
    const msg = `${limitedItem.name} ${
      limitedStock === 0
        ? "is out of stock!"
        : `only ${limitedStock} piece available in stock!`
    } `;
    errorRes(400, msg);
  }
};

/**
 * Get Restaurants By IDs
 */

export const restaurantsByIds = async (
  ids: string[]
): Promise<RestaurantDoc[]> => {
  const restaurants = await Restaurant.find({ _id: { $in: ids } }).select(
    "_id name availability banner_image address type hub managedBy group operating_hours"
  );
  return restaurants;
};

/**
 * Check restaurant availability
 * Check restaurant operating hours
 * Check different hub
 */

export const checkRestaurantStatus = (restaurants: RestaurantDoc[]): void => {
  // TODO:

  let alongWith: RestaurantDoc;
  if (restaurants.length > 1) {
    const outOfGroup = restaurants.find((item) => {
      return restaurants.find((res) => {
        if (
          res._id === item._id ||
          item.type === "sub_store" ||
          res.type === "sub_store"
        )
          return false;
        const group = res.group ?? [];
        if (!group.includes(item._id)) {
          alongWith = res;
          return true;
        }
        return false;
      });
    });

    if (outOfGroup && alongWith) {
      errorRes(
        400,
        `You can't order from ${outOfGroup.name} along with ${alongWith.name} at the same time.`
      );
    }
  }

  restaurants.forEach((restaurant) => {
    const { availability, operating_hours = [20, 6] } = restaurant;
    if (!availability) {
      errorRes(400, `${restaurant.name} isn't available at this moment.`);
    }

    const [start, end] = operating_hours;
    const time = new Date();
    const isOperatingHour = betweenHours(
      20,
      6,
      time.getHours(),
      time.getMinutes()
    );
    const restaurantOpen = betweenHours(
      start,
      end,
      time.getHours(),
      time.getMinutes()
    );

    if (isOperatingHour && !restaurantOpen) {
      errorRes(400, `${restaurant.name} isn't available at this moment.`);
    }
  });

  const groupByHub =
    restaurants.reduce((acc, res) => {
      if (!acc[res.hub]) {
        acc[res.hub] = res;
      }
      return acc;
    }, {}) ?? {};

  const moreThanOneHub = Object.keys(groupByHub).length > 1;
  if (moreThanOneHub) {
    errorRes(
      400,
      "Sorry for the inconvenience, we are not accepting orders from multiple hub at the same time."
    );
  }
};

/**
 * Get delivery charge
 * @param {String} hubId - Hub Id
 * @param {String} customer_area - Customer Area
 * @param {Boolean} required - Is delivery charge required
 * @returns {Promise<number>} Delivery Charge
 */
export const getDeliveryCharge = async (
  hubId: string,
  customer_area: string,
  required: boolean = true
): Promise<number> => {
  const hubArea = await HubArea.findOne({
    hub: `hub${hubId}`,
    name: customer_area.toLowerCase(),
  });

  if (
    ["bashundhara", "bashundhara r/a", "Bashundhara"].includes(hubArea.name)
  ) {
    const now = new Date();
    if (betweenHours(23, 6, now.getHours(), now.getMinutes())) {
      errorRes(
        400,
        "Sorry, kindly place your order before 11 PM for Bashundhara R/A!"
      );
    }
  }

  if (required && (!hubArea || hubArea.delivery_charge === 0)) {
    let msg = `Your selected restaurant is not accepting orders from ${customer_area} area! Try another restaurant.`;
    errorRes(400, msg);
  }

  return hubArea.delivery_charge;
};

const isPromoApplicable = (item: OrderItem, promo: PromoDoc): boolean => {
  const {
    _p_restaurant,
    categories,
    apply_on,
    apply_on_restaurants,
    include_stores,
  } = promo;

  if (
    ["store", "sub_store"].includes(item.restaurant?.type) &&
    !include_stores &&
    !apply_on_restaurants?.includes(item.restaurant?.id)
  ) {
    return false;
  } else if (
    _p_restaurant &&
    item.restaurant?.id !== _p_restaurant.replace("restaurant$", "")
  ) {
    return false;
  } else if (
    apply_on === "categories" &&
    categories &&
    !categories.includes(item.category)
  ) {
    return false;
  } else if (
    !_p_restaurant &&
    Array.isArray(apply_on_restaurants) &&
    apply_on_restaurants.length > 0
  ) {
    if (!apply_on_restaurants.includes(item.restaurant.id)) {
      return false;
    }
  }

  return true;
};

export const orderItemsChargeCalculator = (
  orderItems: ReqOrderItem[],
  products: ProductDoc[],
  restaurants: RestaurantDoc[],
  promo: PromoDoc | null
): {
  items: OrderItem[];
  total: number;
  discount: number;
} => {
  const productsGroup: { [key: string]: ProductDoc } = {};

  products.forEach((item) => {
    productsGroup[item._id] = item;
  });

  const newOrderItems: OrderItem[] = [];

  orderItems.forEach((item, i) => {
    const product: ProductDoc = productsGroup[item.id];
    if (!product || product.availability !== "available") {
      errorRes(400, `Product ${product.name} is not available!`);
    }
    let itemTotal = item.quantity * product.price.amount;

    const restaurant = restaurants.find(
      ({ _id }) => _id === product._p_restaurant.replace("restaurant$", "")
    );

    if (!restaurant) {
      errorRes(400, `${product.name} is not available!`);
    }

    const newVariants: OrderVariant[] = [];

    if (
      product.price.type === "variant" &&
      Array.isArray(product.price.variants) &&
      item.variant
    ) {
      item.variant.forEach((orderVariant, i) => {
        const variation = product.price.variants.find(
          (v) => v.id === orderVariant.variantId
        );

        if (!variation) {
          const msg = `${product.name} variant not available!`;
          errorRes(400, msg);
        }

        const variantItems: VariantItem[] = [];
        const variationItemsObj: { [key: string]: VariantItem } =
          variation.items.reduce((obj, item) => {
            obj[item.id] = item;
            return obj;
          }, {});

        orderVariant.items.forEach((v, i) => {
          const variantItem = variationItemsObj[v.id];
          if (!variantItem || variantItem.availability === false) {
            errorRes(400, `${product.name} variant not available!`);
          }

          itemTotal += item.quantity * variantItem.price;
          variantItems[i] = variantItem;
        });

        newVariants[i] = {
          variantId: variation.id,
          items: variantItems,
        };
      });
    }

    const newAddons: OrderAddon[] = [];
    if (
      Array.isArray(product.addons) &&
      product.addons.items &&
      Array.isArray(item.addons) &&
      item.addons.length > 0
    ) {
      item.addons.forEach((orderAddon, i) => {
        const addon = product.addons.items.find(
          (addon) => addon.id === orderAddon.id
        );
        if (!addon) {
          errorRes(400, `${product.name} addon not available!`);
        }
        itemTotal += item.quantity * addon.price;
        newAddons[i] = addon;
      });
    }

    const newItem: OrderItem = {
      id: item.id,
      name: product.name,
      quantity: item.quantity,
      image: product.images[0] || "",
      sale_unit: product.price.amount,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        image: restaurant.banner_image,
        prefix: restaurant.prefix,
        address: restaurant.address,
        counter: restaurant.counter ?? 0,
        type: restaurant.type,
      },
      category: product._p_category?.replace("category$", "") || "",
      variant: newVariants,
      addons: newAddons,
      total: itemTotal,
      discount: 0,
      isPromoApplicable: false,
    };

    const { type, amount: disAmount, validity } = product.price.discount;

    if (disAmount > 0 && (validity ? new Date(validity) > new Date() : true)) {
      newItem.discount +=
        type === "fixed"
          ? Math.round(disAmount * item.quantity)
          : Math.round((itemTotal * disAmount) / 100);
    }

    // if promo found, then store information for further operations
    if (promo && promo.apply_on !== "delivery_charge") {
      newItem.isPromoApplicable = isPromoApplicable(newItem, promo);
    }

    newOrderItems[i] = newItem;
  });

  const obj = { items: [], total: 0, discount: 0 };

  newOrderItems.forEach((item) => {
    obj.total += item.total;
    obj.discount += item.discount;
    obj.items.push(item);
  });

  return obj;
};

export const getPromoByCodeAndAuth = async (
  code: string,
  auth: string
): Promise<PromoDoc | null> => {
  return await Promo.findOne({ promo_code: code, promo_auth: auth });
};

export const getPromoByCode = async (
  code: string
): Promise<PromoDoc | null> => {
  return await Promo.findOne({ promo_code: code });
};

export function getEstimatedTime(
  restaurant: string = "",
  area: string,
  charge: number = 120
): number {
  if (
    restaurant === "0Wazcdu06O" &&
    ["gulshan", "banani", "niketon", "baridhara", "baridhara dohs"].includes(
      area.toLowerCase()
    )
  ) {
    return 20;
  } else {
    return Math.max(Math.round(charge * 0.67), 30);
  }
}

export const constructPickupObject = (
  orderItems: OrderItem[]
): OrderPickup[] => {
  const groupByRestaurant: { [key: string]: OrderItem[] } = orderItems.reduce(
    (acc, item) => {
      if (!acc[item.restaurant.id]) {
        acc[item.restaurant.id] = [];
      }
      acc[item.restaurant.id].push(item);
      return acc;
    },
    {}
  );

  const pickups = [];

  for (let id in groupByRestaurant) {
    const restaurant = groupByRestaurant[id][0].restaurant;
    const pickup: OrderPickup = {
      id,
      name: restaurant.name,
      order_number: `${restaurant.prefix}-${restaurant.counter + 1}`,
      image: restaurant.image,
      address: restaurant.address || {},
      type: restaurant.type,
      prefix: restaurant.prefix,
      counter: restaurant.counter,
      items: groupByRestaurant[id].map((item) => {
        const { restaurant, ...rest } = item;
        return rest;
      }),
      confirmed: false,
      picked: false,
      ready: false,
    };
    pickups.push(pickup);
  }

  return pickups;
};

export function randomString(size: number): string {
  if (size === 0) {
    throw new Error("Zero-length randomString is useless.");
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";
  let objectId = "";
  const bytes = randomBytes(size);
  for (let i = 0; i < bytes.length; ++i) {
    objectId += chars[bytes.readUInt8(i) % chars.length];
  }
  return objectId;
}

// Returns a new random alphanumeric string suitable for object ID.
export function newObjectId(size: number = 10): string {
  return randomString(size);
}
