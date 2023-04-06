import {
  orderSchemaValidator,
  productsByIds,
  checkProductStatus,
  restaurantsByIds,
  checkRestaurantStatus,
  getDeliveryCharge,
  orderItemsChargeCalculator,
  getPromoByCodeAndAuth,
  getEstimatedTime,
  constructPickupObject,
  newObjectId,
} from "./utils";
import { User } from "../../model/user";
import { isPromoEligible, promoChargeCalculator } from "../avail-promo";
import { Request, Response } from "express";
import { PromoDoc } from "../../model/promo";
import { OrderDoc, Order } from "../../model/order";
import { updateInventory } from "./updateInventory";
import { isErrorResponse } from "../../utils";

export const newOrder = async (req, res: Response) => {
  try {
    const { body, user } = req;
    const value = orderSchemaValidator(body);
    const orderItems = value.order_items;

    // TODO: Validate customer
    // It will be done into middleware

    // Fetch products by order items
    // Check missing items
    // Check inventory status
    const products = await productsByIds(orderItems.map((item) => item.id));
    checkProductStatus(orderItems, products);

    const productsByRestaurant = products.reduce((acc, p) => {
      const id = p._p_restaurant.replace("restaurant$", "");
      if (!acc[id]) {
        acc[id] = p;
      }
      return acc;
    }, {});

    // Fetch & Check restaurant status
    const restaurants = await restaurantsByIds(
      Object.keys(productsByRestaurant)
    );
    checkRestaurantStatus(restaurants);

    // get delivery charge
    let deliveryCharge = await getDeliveryCharge(
      restaurants[0].hub,
      value.customer_area
    );

    // Check Promo availability
    let promo: PromoDoc;
    if (value.promo && value.promoAuth) {
      promo = await getPromoByCodeAndAuth(value.promo, value.promoAuth);
      if (promo) {
        isPromoEligible({
          promo,
          user,
          products,
          restaurants,
          hubId: restaurants[0].hub.replace("hub$", ""),
          payload: {
            lat: value.lat,
            lng: value.lng,
            platform: value.platform,
            customer_area: value.customer_area,
            orderItems,
          },
        });
      }
    }

    // Calculate order items charges
    let {
      items: updatedOrderItems,
      discount,
      total: itemsTotal,
    } = orderItemsChargeCalculator(orderItems, products, restaurants, promo);

    // TODO: Validate group restaurant order

    // Calculate estimated delivery time
    const restIds = updatedOrderItems.map((item) => item.restaurant.id);
    const delivery_time = getEstimatedTime(
      restIds.length > 1 ? null : restIds[0],
      value.customer_area,
      deliveryCharge
    );

    let promoDiscount = 0;
    if (promo) {
      const promoCharges = promoChargeCalculator({
        items: updatedOrderItems,
        promo,
        total: itemsTotal,
        discount,
        delivery_charge: deliveryCharge,
      });

      promoDiscount = promoCharges.promoDiscount;

      if (promoDiscount) {
        discount += promoCharges.promoDiscount;
      }
    }

    const serviceCharge = Math.round(itemsTotal * 0.05);
    const chargeTotal =
      deliveryCharge + itemsTotal - discount + Math.max(serviceCharge, 0);

    // TODO: Check max order value
    if (chargeTotal - deliveryCharge > 5000) {
      //FIXME: throw new Parse.Error(400, "Order amount cannot exceed 5000 TK BDT");
    }

    // Make order object
    const orderObj: OrderDoc = {
      _id: newObjectId(10),
      customer_name: value.customer_name,
      customer_phone: value.customer_phone,
      customer_address: value.customer_address,
      order_items: updatedOrderItems,
      customer_area: value.customer_area,
      status: ["online", "bkash"].includes(value.paymentMethod)
        ? "pending"
        : "created",
      payment_method: value.paymentMethod,
      user,
      note: value.note,
      rider_note: value.rider_note,
      delivery_time,
      platform: value.platform,
      payment_status: value.payment_status,
      payments: value.payments,
      dispatchHour: value.dispatchHour,
      geoPoint: [Number(value.lat), Number(value.lng)],
      geo: [Number(value.lat), Number(value.lng)],
      charge: {
        delivery_charge: deliveryCharge,
        discount,
        items_total: Math.round(itemsTotal),
        promo_discount: Math.round(promoDiscount),
        total: chargeTotal,
        vat: serviceCharge,
      },
      hub: restaurants[0].hub.replace("hub$", ""),
      pickups: constructPickupObject(updatedOrderItems),
    };

    if (promo) {
      const { _id, ...rest } = promo;
      orderObj.promo = {
        objectId: _id,
        ...rest,
      };
    }

    // TODO: Save order
    const order = await Order.create(orderObj);

    // TODO: Inventory update
    await updateInventory(order);

    // TODO: User order counter update
    // TODO: Restaurant counter update
    // TODO: Update promo usage
  } catch (err) {}
};
