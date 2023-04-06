// import { OrderDoc } from "../model/order";

// function newRestaurant(id, name, image) {
//   return {
//     id,
//     name,
//     image,
//     confirm: { count: 0, time: 0 },
//     ready: { count: 0, time: 0 },
//     delivered: 0,
//     rejected: 0,
//     cancelled: 0,
//     ordersPerHour: {},
//     ordersPerDate: {},
//     salesPerDate: {},
//     area: {},
//     soldItems: {},
//     sales: 0,
//     discount: 0,
//     salesGraph: [],
//     averageConfirmTime: "",
//     averagePrepTime: "",
//     users: {},
//   };
// }

// /**
//  * if order delivered, calculate pickup to delivery time and total delivery time
//  * and store customer area wise
//  */
// function updateDeliveryTime(state, order) {
//   const { area } = state;

//   const { status, hub, customer_area, createdAt, completedAt } = order;

//   const customerArea = customer_area.toLowerCase();
//   const hubId = hub?.objectId || "gulshan79";

//   if (!area.hub[hubId]) {
//     area.hubs[hubId] = {
//       pickupToDelivery: {},
//       deliveryTime: {},
//     };
//   }

//   const hubArea = area.hubs[hubId];

//   if (status === "delivered") {
//     let timelineLen = timeline.length - 1;

//     let lastPickedAt = null;
//     for (let i = timelineLen; i > -1; i--) {
//       const { type, current, time } = timeline[i];
//       if (type === "status" && current === "picked") {
//         lastPickedAt = new Date(time);
//         break;
//       }
//     }

//     if (lastPickedAt) {
//       if (!hubArea.pickupToDelivery[customerArea]) {
//         hubArea.pickupToDelivery[customerArea] = {
//           count: 0,
//           time: 0,
//         };
//       }

//       const diff = new Date(completedAt) - lastPickedAt;
//       if (diff > 0) {
//         hubArea.pickupToDelivery[customerArea].count++;
//         hubArea.pickupToDelivery[customerArea].time += diff;
//       }
//     }

//     const createTime = new Date(createdAt);
//     const hour = createTime.getHours();
//     if (hour < 20 && hour > 7) {
//       createTime.setHours(20);
//     }

//     const diff = new Date(completedAt) - createTime;

//     if (diff > 0) {
//       if (!hubArea.deliveryTime[customerArea]) {
//         hubArea.deliveryTime[customerArea] = {
//           count: 0,
//           time: 0,
//         };
//       }

//       hubArea.deliveryTime[customerArea].count++;
//       hubArea.deliveryTime[customerArea].time += diff;
//     }
//   }
// }

// /**
//  * User Report
//  */
// const usersReport = (users, order) => {
//   const { user, customer_name, customer_area, pickups, createdAt } = order;
// };

// /**
//  * Restaurants Report
//  */

// const restaurantsReport = (state, order) => {
//   const { restaurants } = state;

//   const { user, status, customer_area, pickups, createdAt } = order;

//   const customerArea = customer_area.toLowerCase();

//   const time = new Date(createdAt);

//   const confirmedAt = timeline.find(
//     (item) => item.type === "status" && item.current === "confirmed"
//   );

//   pickups.forEach((pickup) => {
//     const { id, name, image, items } = pickup;

//     if (!restaurants[id]) {
//       restaurants[id] = newRestaurant(id, name, image);
//     }

//     const restaurant = restaurants[id];
//     restaurant[status] += 1;

//     // customer area update
//     if (!restaurant.area[customerArea]) {
//       restaurant.area[customerArea] = 1;
//     } else {
//       restaurant.area[customerArea]++;
//     }

//     // orders per hour update
//     const hour = time.getHours();
//     if (!restaurant.ordersPerHour[hour]) {
//       restaurant.ordersPerHour[hour] = 1;
//     } else {
//       restaurant.ordersPerHour[hour]++;
//     }

//     // orders per date update
//     const date = operationalDate(time).toLocaleDateString();
//     if (!restaurant.ordersPerDate[date]) {
//       restaurant.ordersPerDate[date] = 1;
//     } else {
//       restaurant.ordersPerDate[date]++;
//     }

//     if (restaurant.salesPerDate[date] === undefined) {
//       restaurant.salesPerDate[date] = 0;
//     }

//     if (confirmedAt?.time) {
//       const restConfirmTime = timeline.find(({ type, current, msg }) => {
//         return (
//           type === "restaurant_order" &&
//           current === "confirmed" &&
//           msg.includes(name)
//         );
//       });

//       const readyAt = timeline.find(({ type, current, msg }) => {
//         return (
//           type === "restaurant_order" &&
//           current === "ready" &&
//           msg.includes(name)
//         );
//       });

//       if (restConfirmTime) {
//         let ct = new Date(restConfirmTime.time) - new Date(confirmedAt.time);
//         if (ct > 0) {
//           restaurant.confirm.count++;
//           restaurant.confirm.time += ct;
//         }
//       }

//       if (readyAt && restConfirmTime) {
//         let rt = new Date(readyAt.time) - new Date(restConfirmTime.time);
//         if (rt > 0) {
//           restaurant.ready.count++;
//           restaurant.ready.time += rt;
//         }
//       }
//     }

//     // Update sold items and sales
//     if (status === "delivered") {
//       const { soldItems } = restaurant;
//       items.forEach((item) => {
//         const { id, name, quantity, variant, discount, total } = item;

//         if (!soldItems[id]) {
//           soldItems[id] = {
//             id,
//             name,
//             orderCount: 0,
//             quantity: 0,
//             total: 0,
//             variants: {},
//             discount: 0,
//           };
//         }

//         // Restaurant Sales update
//         restaurant.sales += total;
//         restaurant.discount += discount;
//         restaurant.salesPerDate[date] += total;

//         // Sold Items update
//         soldItems[id].orderCount++;
//         soldItems[id].quantity += quantity;
//         soldItems[id].total += total;

//         if (discount) {
//           soldItems[id].discount += discount;
//         }

//         if (Array.isArray(variant)) {
//           variant.forEach(({ items }) => {
//             items.forEach((v) => {
//               if (!soldItems[id].variants[v.id]) {
//                 soldItems[id].variants[v.id] = {
//                   id: v.id,
//                   name: v.name,
//                   quantity: 0,
//                 };
//               }

//               soldItems[id].variants[v.id].quantity += quantity;
//             });
//           });
//         }
//       });
//     }
//   });
// };

// const generateReport = () => {
//   const orders: OrderDoc[] = [];

//   const state = {
//     users: {},
//     products: {},
//     restaurants: {},
//     area: {
//       hubs: {},
//     },
//   };

//   orders.forEach((order) => {
//     updateDeliveryTime(state, order);
//     restaurantsReport(state, order);
//   });
// };
