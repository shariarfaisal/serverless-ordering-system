import mongoose from "mongoose";

class VariantItem {
  id: string;
  name: string;
  price: number;
  availability: string | boolean;
}

class ProductVariant {
  id: string;
  title: string;
  min: number;
  max: number;
  items: VariantItem[];
}

class ProductPrice {
  amount: number;
  type: string;
  discount: {
    type: string;
    amount: number;
    validity: string;
  };
  variants: ProductVariant[];
}

class AddonItem {
  id: string;
  name: string;
  price: number;
}

class ProductAddons {
  title: string;
  min: number;
  max: number;
  items: AddonItem[];
}

class TimelineItem {
  type: string;
  msg: string;
  time: string;
  user: string;
}

class ProductInventory {
  createdAt: string;
  id: string;
  stock: number;
  quantity: number;
  unit_price: number;
  selling_price: number;
  stockOutAt?: string;
}

class ProductDoc extends mongoose.Document {
  _id: string;
  name: string;
  slug: string;
  details?: string;
  images: string[];
  availability: "available" | "unavailable" | "stock out";
  price: ProductPrice;
  addons?: ProductAddons;
  stock?: number;
  is_inv?: boolean;
  inventory?: ProductInventory[];
  timeline?: TimelineItem[];
  approval_status?: "approved" | "rejected";
  sold?: number;
  _p_category: string;
  _p_restaurant: string;
}

const productSchema = new mongoose.Schema({
  _id: String,
  name: String,
  slug: String,
  details: String,
  images: [String],
  availability: String,
  price: {
    amount: Number,
    type: String,
    discount: {
      type: String,
      amount: Number,
      expiredAt: String,
    },
    variants: [
      {
        title: String,
        min: Number,
        max: Number,
        items: [
          {
            id: String,
            name: String,
            price: Number,
            availability: String,
          },
        ],
      },
    ],
  },
  stock: Number,
  inventory: [
    {
      objectId: String,
      stock: Number,
      remain: Number,
    },
  ],
  timeline: [
    {
      type: String,
      msg: String,
      time: String,
      user: String,
    },
  ],
  approval_status: String,
  sold: Number,
  _p_category: String,
  _p_restaurant: String,
});

const Product = mongoose.model<ProductDoc>("product", productSchema, "product");

export {
  Product,
  ProductDoc,
  ProductPrice,
  ProductAddons,
  ProductVariant,
  VariantItem,
  AddonItem,
  TimelineItem,
};
