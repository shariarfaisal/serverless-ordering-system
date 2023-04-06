import mongoose from "mongoose";

interface PromoDoc {
  _id: string;
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
  _p_restaurant?: string;
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

const promoSchema = new mongoose.Schema({
  _id: String,
  promo_code: String,
  eligible_users: [String],
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
  categories: [String],
  restaurant: String,
  max_order: Number,
  include_stores: Boolean,
  apply_on_restaurants: [String],
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
});

const Promo = mongoose.model<PromoDoc>("promo", promoSchema, "promo");

export { Promo, PromoDoc };
