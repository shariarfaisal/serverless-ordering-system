import { Inventory } from "../../model/inventory";
import { Order, OrderDoc } from "../../model/order";
import { productsByIds } from "./utils";

export const updateInventory = async (order: OrderDoc) => {
  let items = order.order_items;

  const {
    qtyById,
    priceById,
  }: {
    qtyById: { [key: string]: number };
    priceById: { [key: string]: number };
  } = items.reduce(
    (acc, item) => {
      if (!acc.qtyById[item.id]) {
        acc.qtyById[item.id] = item.quantity;
      } else {
        acc.qtyById[item.id] += item.quantity;
      }

      acc.priceById[item.id] = item.sale_unit;
      return acc;
    },
    { qtyById: {}, priceById: {} }
  );

  const products = await productsByIds(Object.keys(qtyById));

  if (products?.length) {
    const invHistory: {
      [key: string]: {
        id: string;
        amount: number;
        quantity: number;
        takenRecords: {
          id: string;
          quantity: number;
        }[];
      };
    } = {};

    products.forEach((product) => {
      product.stock -= qtyById[product.id];

      let qty = qtyById[product.id];

      invHistory[product.id] = {
        id: product.id,
        amount: 0,
        quantity: 0,
        takenRecords: [],
      };

      const productInventory = product.inventory;

      if (Array.isArray(productInventory)) {
        const emptyRecords = [];
        productInventory.forEach((inv, i) => {
          if (qty <= 0) return;
          if (inv.stock) {
            if (inv.stock < qty) {
              invHistory[product.id].amount +=
                inv.stock * priceById[product.id] - inv.stock * inv.unit_price;
              invHistory[product.id].quantity += inv.stock;
              invHistory[product.id].takenRecords.push({
                id: inv.id,
                quantity: inv.stock,
              });
              qty -= inv.stock;
              inv.stock = 0;
              inv.stockOutAt = new Date().toISOString();
            } else if (inv.stock >= qty) {
              invHistory[product.id].amount +=
                qty * priceById[product.id] - qty * inv.unit_price;
              invHistory[product.id].quantity += qty;
              invHistory[product.id].takenRecords.push({
                id: inv.id,
                quantity: qty,
              });
              inv.stock -= qty;
              qty = 0;

              if (inv.stock === 0) inv.stockOutAt = new Date().toISOString();
            }
          } else {
            emptyRecords.push(i);
          }
        });

        if (emptyRecords.length) {
          emptyRecords.forEach((index) => {
            const inv = productInventory[index];
            if (
              inv?.stockOutAt &&
              new Date().getTime() - new Date(inv.stockOutAt).getTime() >
                1000 * 60 * 60 * 24 * 3
            ) {
              productInventory.splice(index, 1);
            }
          });
        }

        product.set("inventory", productInventory);
      }
    });

    //TODO: await Parse.Object.saveAll(products, { useMasterKey: true });

    if (Object.keys(invHistory).length) {
      const invQtyChangesById = Object.values(invHistory).reduce(
        (acc, curr) => {
          curr.takenRecords.forEach(({ id, quantity }) => {
            if (!acc[id]) acc[id] = 0;
            acc[id] += quantity;
          });

          return acc;
        },
        {}
      );

      const inventories = await Inventory.find({
        _id: { $in: Object.keys(invQtyChangesById) },
      })
        .select("_id stock")
        .exec();
      inventories.forEach((inv) => {
        inv.stock -= invQtyChangesById[inv._id];
      });

      await Inventory.bulkSave(inventories);

      order.inventory = Object.values(invHistory);
      await Order.updateOne(
        { _id: order._id },
        { inventory: order.inventory }
      ).exec();
    }
  }
};
