import express from "express";
import { json } from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "./model/product";
import { getUserAnalytics } from "./controllers/userAnalytics";

mongoose.pluralize((str) => str);

dotenv.config();
const app = express();

app.use(json());
app.use(cors());

app.post("/user", async (req, res) => {
  try {
    console.log(req.body);
    const users = await getUserAnalytics(req.body);
    return res.send(users);
  } catch (err) {
    return res.send({ error: err.message });
  }

  // {
  //   topics: [
  //     "fromArea",
  //     "registrationHour",
  //     "orderFrequency",
  //     "orderTiming",
  //     "orderFromArea",
  //   ],
  //   attributes: ["_created_at", "name"],
  //   filter: {
  //     sortBy: "_created_at",
  //     sortingOrder: "asc",
  //     limit: 100,
  //     _created_at: ["2022-08-01T17:04:01.919Z", "2022-08-31T17:04:01.919Z"],
  //   },
  // }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

app.listen(3000, async () => {
  await mongoose.connect(process.env.databaseURI, { autoIndex: true });
  console.log("server running on 3000");
});

export default app;
