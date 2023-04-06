import mongoose from "mongoose";

interface UserAttr {
  name: string;
  username: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: {
    __type: string;
    iso: string;
  };
}

interface UserDoc {
  _id: string;
  name: string;
  username: string;
  email: string;
  gender: string;
  date_of_birth: {
    __type: string;
    iso: string;
  };
  phone: string;
  locations: {
    address: string;
    latitude: number;
    longitude: number;
    apartment: string;
    area: string;
    city: string;
    flat: string;
    floor: string;
    label: string;
    name: string;
    phone: string;
    postCode: string;
  }[];
  device_info?: {
    type: "Android" | "iOS" | "Web";
  };
  _created_at: string;
}

interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttr): UserDoc;
}

const userSchema = new mongoose.Schema({
  _id: String,
  name: String,
  username: String,
  phone: String,
  email: String,
  gender: String,
  date_of_birth: {
    __type: String,
    iso: String,
  },
  _created_at: {
    type: Date,
    default: Date.now,
  },
  _updated_at: {
    type: Date,
  },
  lastLogin: Date,
  locations: [
    {
      address: String,
      area: String,
      city: String,
      latitude: Number,
      longitude: Number,
      apartment: String,
      flat: String,
      floor: String,
      label: String,
      name: String,
      phone: String,
      postCode: String,
    },
  ],
  device_info: {
    type: String,
  },
});

userSchema.statics.createNew = (attrs: UserAttr) => {
  return new User(attrs);
};

const User = mongoose.model<UserDoc, UserModel>("_User", userSchema, "_User");

export { User, UserAttr, UserDoc };
