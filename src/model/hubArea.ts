import mongoose from "mongoose";

interface HubAreaDoc extends mongoose.Document {
  _id: string;
  name: string;
  delivery_charge: number;
  hub: string;
}

const hubAreaSchema = new mongoose.Schema({
  _id: String,
  name: String,
  delivery_charge: Number,
  hub: String,
});

const HubArea = mongoose.model<HubAreaDoc>(
  "hub_area",
  hubAreaSchema,
  "hub_area"
);

export { HubArea, HubAreaDoc };
