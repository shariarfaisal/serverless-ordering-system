import mongoose from "mongoose";

export interface InventoryDoc {
  _id: string;
  _p_product: string;
  stock: number;
  _created_at: string;
  _updated_at?: string;
  quantity: number;
  selling_price: number;
  unit_price: number;
}

const InventorySchema = new mongoose.Schema({
  _id: String,
  _p_product: String,
  stock: Number,
  _created_at: String,
  _updated_at: String,
  quantity: Number,
  selling_price: Number,
  unit_price: Number,
});

const Inventory = mongoose.model<InventoryDoc>("Inventory", InventorySchema);

export { Inventory };
