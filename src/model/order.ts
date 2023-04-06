import mongoose from "mongoose";
import { PromoDoc } from "./promo";

class OrderVariant {
  variantId: string;
  items: {
    id: string;
    name: string;
    price: number;
    availability?: string | boolean;
  }[];
}

class OrderAddon {
  id: string;
  name: string;
  price: number;
}

class OrderItemRestaurant {
  id: string;
  name: string;
  image?: string;
  type: "restaurant" | "store" | "sub_store";
  prefix: string;
  counter: number;
  address?: {
    address: string;
    area: string;
    latitude: string;
    longitude: string;
  } | null;
}

class OrderItem {
  id: string;
  name: string;
  image: string;
  sale_unit: number;
  quantity: number;
  discount: number;
  promoDiscount?: number;
  total: number;
  restaurant: OrderItemRestaurant;
  category?: string;
  variant?: OrderVariant[] | null;
  addons?: OrderAddon[] | null;
  isPromoApplicable?: boolean;
}

class OrderPromo {
  objectId: string;
  promo_code: string;
  eligible_users?: string[];
  max_usage: number;
  promo_amount: number;
  applicable_from: "app" | "web" | "both";
  promo_type: "Fixed" | "Percentage";
  start_date: string;
  end_date: string;
  apply_on: "product" | "categories" | "delivery_charge";
  min_order_amount: number;
  promo_auth: string;
  max_discount_amount: number;
  is_active: boolean;
  categories?: string[];
  restaurant?: string;
  max_order?: number;
  include_stores?: boolean;
  apply_on_restaurants?: string[];
  totalUsage?: number;
  activeTime?: {
    startTime: string;
    endTime: string;
  }[];
  title?: string;
  subTitle?: string;
  max_usage_user?: number;
  min_order?: number;
}

class PickupItem {
  id: string;
  name: string;
  image: string;
  sale_unit: number;
  quantity: number;
  discount: number;
  promoDiscount?: number;
  total: number;
  category?: string;
  variant?: OrderVariant[] | null;
  addons?: OrderAddon[] | null;
  isPromoApplicable?: boolean;
}

class OrderPickup {
  id: string;
  order_number: string;
  name: string;
  image?: string;
  type: "restaurant" | "store" | "sub_store";
  prefix: string;
  counter: number;
  address: {
    address?: string;
    area?: string;
    latitude?: string;
    longitude?: string;
  };
  items: PickupItem[];
  confirmed: boolean;
  ready: boolean;
  picked: boolean;
}

class OrderCharge {
  delivery_charge: number;
  discount: number;
  items_total: number;
  promo_discount: number;
  total: number;
  vat: number;
}

type OrderStatus =
  | "created"
  | "confirmed"
  | "preparing"
  | "ready"
  | "pending"
  | "rejected"
  | "cancelled"
  | "delivered";

class OrderDoc {
  _id: string;
  _p_user: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_area: string;
  order_items: OrderItem[];
  payment_method: "cod" | "online" | "bkash";
  temp_order?: string;
  payments?: any[];
  payment_status?: "paid";
  promo?: OrderPromo;
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
  rejected_for?: string;
  rejection_reason?: string;
  geo?: [number, number];
  charge: OrderCharge;
  hub: string;
  pickups: OrderPickup[];
  delivery_time: number;
  rider?: string;
  completedAt?: string;
  status: OrderStatus;
  issue?: string;
  isReviewed?: boolean;
  geoPoint?: [number, number];
  eligible_users?: string[];
  inventory?: {
    id: string;
    amount: number;
    quantity: number;
    takenRecords: {
      id: string;
      quantity: number;
    }[];
  }[];
  _created_at: string;
  _updated_at: string;
}

const orderSchema = new mongoose.Schema({
  _id: String,
  _p_user: String,
  customer_name: String,
  customer_address: String,
  customer_phone: String,
  customer_area: String,
  order_items: [
    {
      id: String,
      name: String,
      image: String,
      sale_unit: Number,
      discount: Number,
      promoDiscount: Number,
      total: Number,
      restaurant: {
        id: String,
        name: String,
        banner_image: String,
        type: String,
        prefix: String,
        counter: Number,
        address: {
          address: String,
          area: String,
          latitude: String,
          longitude: String,
        },
      },
      variant: {
        variantId: String,
        items: [
          {
            id: String,
            name: String,
          },
        ],
      },
      addons: [
        {
          id: String,
          name: String,
        },
      ],
    },
  ],
  temp_order: String,
  payments: Array,
  payment_status: String,
  promo: {
    objectId: String,
    promo_code: String,
    eligible_users: Array,
    max_usage: Number,
    promo_amount: Number,
    applicable_from: String,
    promo_type: String,
    start_date: String,
    end_date: String,
    apply_on: String,
    min_order_amount: Number,
    promo_auth: String,
    max_discount_amount: Number,
    is_active: Boolean,
    categories: Array,
    restaurant: String,
    max_order: Number,
    include_stores: Boolean,
    apply_on_restaurants: Array,
    totalUsage: Number,
    activeTime: [
      {
        startTime: String,
        endTime: String,
      },
    ],
    title: String,
    subTitle: String,
    max_usage_user: Number,
    min_order: Number,
  },
  note: String,
  rider_note: String,
  platform: String,
  lat: String,
  lng: String,
  by_manager: Boolean,
  dispatchHour: {
    h: Number,
    text: String,
  },
  rejected_for: String,
  rejection_reason: String,
  geo: Array,
  charge: {
    delivery_charge: Number,
    discount: Number,
    items_total: Number,
    promo_discount: Number,
    total: Number,
  },
  hub: String,
  pickups: [
    {
      id: String,
      name: String,
      banner_image: String,
      type: String,
      prefix: String,
      counter: Number,
      address: {
        address: String,
        area: String,
        latitude: String,
        longitude: String,
      },
      items: [
        {
          id: String,
          name: String,
          image: String,
          sale_unit: Number,
          discount: Number,
          promoDiscount: Number,
          total: Number,
          variant: {
            variantId: String,
            items: [
              {
                id: String,
                name: String,
              },
            ],
          },
          addons: [
            {
              id: String,
              name: String,
            },
          ],
        },
      ],
    },
  ],
  delivery_time: Number,
  rider: String,
  completedAt: Date,
  status: String,
  issue: String,
  isReviewed: Boolean,
  geoPoint: {
    latitude: Number,
    longitude: Number,
  },
  delete: Boolean,
  payment_method: String,
  _created_at: Date,
});

const Order = mongoose.model<OrderDoc>("order", orderSchema, "order");

export {
  Order,
  OrderDoc,
  OrderPromo,
  OrderPickup,
  OrderItem,
  OrderCharge,
  PickupItem,
  OrderVariant,
  OrderAddon,
  OrderStatus,
};
