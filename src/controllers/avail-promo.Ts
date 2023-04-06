import { UserDoc } from "../model/user";
import { PromoDoc } from "../model/promo";
import { Order, OrderItem } from "../model/order";
import Joi from "joi";
import { Request, Response } from "express";

import { IsNotNullOrUndefined, dayStartHour, addDays } from "../utils";
import { isBefore, isAfter } from "date-fns";
import {
  productsByIds,
  checkProductStatus,
  restaurantsByIds,
  checkRestaurantStatus,
  getDeliveryCharge,
  orderItemsChargeCalculator,
  ReqOrderItem,
  getPromoByCode,
  orderItemsSchema,
} from "./order/utils";
import { ProductDoc } from "../model/product";
import { RestaurantDoc } from "../model/restaurant";

interface PromoAvailPayload {
  user: UserDoc;
  products: ProductDoc[];
  restaurants: RestaurantDoc[];
  promo: PromoDoc;
  hubId: string;
  payload: {
    lat: string;
    lng: string;
    platform: string;
    customer_area: string;
    orderItems: ReqOrderItem[];
  };
}

export const isPromoEligible = async (params: PromoAvailPayload) => {
  const { user, promo, payload } = params;

  const {
    _id,
    is_active,
    eligible_users,
    start_date,
    end_date,
    max_usage,
    applicable_from,
    activeTime,
    max_order = 0,
    min_order = 0,
    totalUsage = 0,
    max_usage_user = 0,
  } = promo;

  if (is_active === false) {
    // TODO: throw error invalid promo
  }

  // check user max and min order
  if (IsNotNullOrUndefined(min_order) || IsNotNullOrUndefined(max_order)) {
    const orderCount = await Order.find({
      _p_user: user._id,
      delete: false,
    }).count();

    if (IsNotNullOrUndefined(min_order) && min_order > orderCount) {
      // TODO: ErrorMessages.PROMOTION_NOT_APPLICABLE_USER
    } else if (IsNotNullOrUndefined(max_order) && orderCount > max_order) {
      // TODO: ErrorMessages.PROMOTION_NOT_APPLICABLE_USER
    }
  }

  const eligibleUsers = eligible_users;
  const currentUserId = user.id;
  let startDate = new Date(start_date);
  let endDate = new Date(end_date);
  const now = new Date();

  if (
    Array.isArray(eligibleUsers) &&
    eligibleUsers.length > 0 &&
    !eligibleUsers.includes(currentUserId)
  ) {
    return false;
  }

  if (Array.isArray(activeTime) && activeTime.length > 0) {
    const date = now.toLocaleDateString();

    const [isActive] = activeTime.filter((times) => {
      if (times.startTime && times.endTime) {
        const startTime = new Date(`${date} ${times.startTime}`);
        let endTime = new Date(`${date} ${times.endTime}`);

        if (
          startTime.toString() !== "Invalid Date" &&
          endTime.toString() !== "Invalid Date"
        ) {
          if (endTime < startTime) {
            endTime = addDays(endTime, 1);
          }
          if (isBefore(now, endTime) && isAfter(now, startTime)) {
            return true;
          }
        }
      }
      return false;
    });

    if (!isActive) {
      //TODO: ErrorMessages.PROMO_EXPIRED
    }
  } else {
    startDate = dayStartHour(startDate);
    endDate = addDays(dayStartHour(endDate), 1);

    if (isBefore(now, startDate) || isAfter(now, endDate)) {
      // TODO: ErrorMessages.PROMO_EXPIRED
    }
  }

  if (applicable_from) {
    if (applicable_from !== "both" && applicable_from !== payload.platform) {
      // TODO: `Sorry, this promo code is not applicable for you!`
    }
  }

  // Check eligibility and usage
  if (
    Array.isArray(eligibleUsers) &&
    eligibleUsers.length > 0 &&
    !eligibleUsers.includes(currentUserId)
  ) {
    // TODO: ErrorMessages.PROMOTION_NOT_APPLICABLE_USER
  } else if (max_usage_user > 0) {
    const countUserPromoUsage = await Order.find({
      _p_user: user._id,
      "promo.objectId": _id,
      delete: false,
    }).count();

    if (countUserPromoUsage >= max_usage_user) {
      // TODO: ErrorMessages.PROMOTION_NOT_APPLICABLE_USER
    }
  } else if (max_usage > 0) {
    if (totalUsage !== 0 && totalUsage >= max_usage) {
      // throw new Parse.Error(401, ErrorMessages.PROMOTION_NOT_APPLICABLE_USER);
      return;
    }
  }

  return true;
};

const calculatePromoAmount = (
  total: number,
  promo_type: string,
  promo_amount: number
): number => {
  if (promo_type === "Fixed") {
    return Math.min(promo_amount, total);
  } else {
    return Math.round((total * promo_amount) / 100);
  }
};

interface PromoChargeCalculatorPayload {
  items: OrderItem[];
  promo: PromoDoc;
  total: number;
  discount: number;
  delivery_charge: number;
}

interface PromoChargeCalculatorRes {
  items: OrderItem[];
  discount: number;
  promoDiscount: number;
  delivery_charge: number;
}

export const promoChargeCalculator = (
  params: PromoChargeCalculatorPayload
): PromoChargeCalculatorRes => {
  let { items, promo, total, discount, delivery_charge } = params;

  let promoDiscount = 0;

  const {
    min_order_amount,
    max_discount_amount,
    promo_type,
    promo_amount,
    apply_on,
  } = promo ?? {};

  if (promo && apply_on !== "delivery_charge") {
    const isApplicable = items.some((item) => item.isPromoApplicable);
    if (!isApplicable) {
      // TODO: `Promo code ${promo?.promo_code} is not applicable to any of the selected items!`
    }

    // if promo fixed, then count items, total, min, max
    let info = items.reduce(
      (acc, item) => {
        if (item.isPromoApplicable) {
          acc.count++;
          acc.total += item.total - item.discount;
          acc.discount += item.discount;
        }
        return acc;
      },
      { count: 0, total: 0, discount: 0 }
    );

    promoDiscount = calculatePromoAmount(info.total, promo_type, promo_amount);

    const calculateAmountPercentage = (
      total: number,
      itemTotal: number,
      maxDiff: number,
      promoAmount: number
    ) => {
      const percentage = (maxDiff * 100) / total;
      const removableAmount = (itemTotal * percentage) / 100;
      return Math.round((itemTotal * promoAmount) / 100 - removableAmount);
    };

    if (min_order_amount <= info.total) {
      const promoMaxDiff = promoDiscount - max_discount_amount;
      promoDiscount = Math.min(promoDiscount, max_discount_amount, total);

      items.forEach((item) => {
        if (item.isPromoApplicable) {
          let itemDiscount: number;

          if (promo_type === "Fixed") {
            itemDiscount = Math.round(
              ((item.total - item.discount) * promo_amount) / info.total
            );
          } else if (promoMaxDiff < 0) {
            itemDiscount = calculatePromoAmount(
              item.total - item.discount,
              promo_type,
              promo_amount
            );
          } else {
            itemDiscount = calculateAmountPercentage(
              info.total,
              item.total - item.discount,
              promoMaxDiff,
              promo_amount
            );
          }

          item.promoDiscount = Math.round(itemDiscount);
        }
      });
    } else {
      // TODO: ErrorMessages.PROMO_CHARGE_ERROR
    }
  } else if (promo && apply_on === "delivery_charge") {
    if (
      Array.isArray(promo.apply_on_restaurants) &&
      promo.apply_on_restaurants.length > 0
    ) {
      const selectedItems = items.filter((item) => {
        return (
          promo.apply_on_restaurants?.includes(item.restaurant.id) ||
          (["store", "sub_store"].includes(item.restaurant.type) &&
            promo.include_stores)
        );
      });

      const itemsTotal = selectedItems.reduce(
        (acc, item) => acc + item.total,
        0
      );

      const itemsDiscount = selectedItems.reduce(
        (acc, item) => acc + item.discount,
        0
      );

      if (min_order_amount > itemsTotal - itemsDiscount) {
        // FIXME: `Minimum order amount is ${min_order_amount} to apply this promo from selected restaurants!`
      }

      const { promo_type, promo_amount } = promo;
      promoDiscount = calculatePromoAmount(
        delivery_charge,
        promo_type,
        promo_amount
      );
    } else {
      if (!promo.include_stores) {
        const storeItems = items.filter((item) =>
          ["store", "sub_store"].includes(item.restaurant.type)
        );
        const storeItemsTotal = storeItems.reduce(
          (acc, item) => acc + item.total,
          0
        );
        const storeItemsDiscount = storeItems.reduce(
          (acc, item) => acc + item.discount,
          0
        );
        total -= storeItemsTotal;
        discount -= storeItemsDiscount;
      }

      if (min_order_amount > total - discount) {
        // FIXME: `Minimum order amount is ${min_order_amount} to apply this promo from selected restaurants!`
      }

      const { promo_type, promo_amount } = promo;
      promoDiscount = calculatePromoAmount(
        delivery_charge,
        promo_type,
        promo_amount
      );
    }
  }

  return { items, discount, promoDiscount, delivery_charge };
};

const schema = Joi.object<AvailPromoReqBody>({
  promo_code: Joi.string().required(),
  order_items: Joi.array().items(orderItemsSchema).required(),
  customer_area: Joi.string().required(),
  lat: Joi.string().optional(),
  lng: Joi.string().optional(),
  platform: Joi.string().optional(),
});

interface AvailPromoReqBody {
  promo_code: string;
  order_items: ReqOrderItem[];
  customer_area: string;
  lat: string;
  lng: string;
  platform?: string;
}

export const availPromo = async (req: Request, res: Response) => {
  try {
    const { body, user } = req.body;

    const { error, value } = schema.validate(body);
    if (error) {
      // TODO:
      return;
    }
    const orderItems = value?.order_items;

    // TODO: Check Promo availability
    const promo = await getPromoByCode(value.promo_code);
    if (!promo) {
      // TODO: throw error
      return;
    }

    const products = await productsByIds(orderItems.map((item) => item.id));
    checkProductStatus(orderItems, products);

    const productsByRestaurant = products.reduce((acc, p) => {
      const id = p._p_restaurant.replace("restaurant$", "");
      if (!acc[id]) {
        acc[id] = p;
      }
      return acc;
    }, {});

    // TODO: Fetch & Check restaurant status
    const restaurants = await restaurantsByIds(
      Object.keys(productsByRestaurant)
    );
    checkRestaurantStatus(restaurants);

    const isEligible = isPromoEligible({
      user,
      products,
      restaurants,
      promo,
      hubId: restaurants[0].hub,
      payload: {
        lat: value.lat,
        lng: value.lng,
        platform: value.platform || "gulshan",
        customer_area: value.customer_area,
        orderItems,
      },
    });

    if (!isEligible) {
      // TODO: throw error
      return;
    }

    // TODO: get delivery charge
    let deliveryCharge = await getDeliveryCharge(
      restaurants[0].hub,
      value.customer_area
    );

    // TODO: Calculate items charge
    const {
      items: updatedOrderItems,
      discount,
      total,
    } = orderItemsChargeCalculator(orderItems, products, restaurants, promo);

    promoChargeCalculator({
      total,
      delivery_charge: deliveryCharge,
      items: updatedOrderItems,
      promo,
      discount,
    });

    const result = {
      promoCode: promo.promo_code,
      promoAuth: promo.promo_auth,
      promoType: promo.promo_type,
      promoAmount: promo.promo_amount,
      maximumDiscountAmount: promo.max_discount_amount,
      maximumUsage: promo.max_usage,
    };

    res.status(200).send(result);
  } catch (err) {
    console.log(err);
    // FIXME:
    res.status(err.code || 500).send(err.message);
  }
};
