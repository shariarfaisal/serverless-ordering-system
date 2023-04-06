import mongoose from "mongoose";

interface HubDoc extends mongoose.Document {
  _id: string;
  name: string;
  slug: string;
  address: {
    address: string;
    area: string;
    latitude: string;
    longitude: string;
  };
  areas: {
    name: string;
  }[];
}

const hubSchema = new mongoose.Schema({
  _id: String,
  name: String,
  address: {
    address: String,
    area: String,
    latitude: String,
    longitude: String,
  },
  areas: [
    {
      name: String,
    },
  ],
});

const Hub = mongoose.model<HubDoc>("hub", hubSchema, "hub");

export { Hub, HubDoc };
