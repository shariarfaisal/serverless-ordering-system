import mongoose from "mongoose";

interface RestaurantDoc extends mongoose.Document {
  _id: string;
  name: string;
  slug: string;
  banner_image: string;
  vat: number;
  commission: number;
  commission_type: "percentage" | "flat";
  cuisines: string;
  operating_hours: number[];
  prefix: string;
  address: {
    address: string;
    area: string;
    latitude: string;
    longitude: string;
  };
  hub: string;
  type: "restaurant" | "store" | "sub_store";
  availability: boolean;
  counter: number;
  managedBy: string;
  group: string[];
}

const restaurantSchema = new mongoose.Schema({
  _id: String,
  name: String,
  slug: String,
  banner_image: String,
  vat: Number,
  commission: Number,
  commission_type: String,
  cuisines: String,
  operating_hours: [Number],
  prefix: String,
  address: {
    address: String,
    area: String,
    latitude: String,
    longitude: String,
  },
  hub: String,
  type: String,
  availability: Boolean,
  counter: Number,
  managedBy: String,
  group: [String],
});

const Restaurant = mongoose.model<RestaurantDoc>(
  "restaurant",
  restaurantSchema,
  "restaurant"
);

export { Restaurant, RestaurantDoc };
