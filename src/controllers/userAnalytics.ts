import { User } from "../model/user";
import { Order } from "../model/order";
import { Hub } from "../model/hub";

type Topic = "topOrder" | "orderTiming" | "orderFrequency" | "fromArea";

interface Query {
  topics: string[];
  attributes: string[];
  filter: {
    [key: string]: any;
  };
}

const queryParams = {
  topics: [
    {
      name: "Users Order Hour",
      key: "orderTiming",
    },
    {
      name: "Users Order Frequency",
      key: "orderFrequency",
    },
    {
      name: "Users From Area",
      key: "userFromArea",
    },
    {
      name: "Most Order From Areas",
      key: "orderFromArea",
    },
    {
      name: "Most Registration In Hour",
      key: "registrationHour",
    },
  ],
  filterOptions: {
    attributes: [
      {
        name: "Name",
        key: "name",
        type: "string",
      },
      {
        name: "Username",
        key: "username",
        type: "string",
      },
      {
        name: "Phone",
        key: "phone",
        type: "string",
      },
      {
        name: "Date of Birth",
        key: "date_of_birth",
        date: true,
        type: "date",
      },
      {
        name: "Gender",
        key: "gender",
        filters: [
          { text: "Male", value: "male" },
          { text: "Female", value: "female" },
        ],
        type: "string",
      },
      {
        name: "Email",
        key: "email",
        type: "string",
      },
      {
        name: "Area",
        key: "address.area",
        type: "string",
      },
      {
        name: "Created At",
        key: "_created_at",
        date: true,
        type: "date",
      },
      {
        name: "Last login",
        key: "lastLogin",
        date: true,
        type: "date",
      },
      {
        name: "Order count",
        key: "order_count",
        range: true,
        type: "number",
      },
      {
        name: "Platform",
        key: "device_info.type",
        filters: [
          { text: "Android", value: "android" },
          { text: "iOS", value: "ios" },
          { text: "Web", value: " " },
        ],
        type: "string",
      },
    ],
    sortingOrder: [
      { name: "Ascending", key: "asc" },
      { name: "Descending", key: "desc" },
    ],
  },
};

async function getUserAnalytics(query: Query) {
  try {
    const {
      topics = [],
      attributes = [],
      filter: {
        sortBy = "_created_at",
        sortingOrder = "asc",
        limit = 100,
        skip,
        ...attrFilter
      },
    } = query;

    const isUsers = topics.includes("users");
    const isOrderTiming = topics.includes("orderTiming");
    const isRegistrationHour = topics.includes("registrationHour");
    const isOrderFrequency = topics.includes("orderFrequency");
    const isOrderFromArea = topics.includes("orderFromArea");
    const isUserFromArea = topics.includes("userFromArea");

    if (topics.length > 0) {
      attributes.push("_id");
    }

    if (isUserFromArea && !attributes.includes("locations.area")) {
      attributes.push("locations.area");
    }
    if (isOrderFromArea && !attributes.includes("locations.area")) {
      attributes.push("locations.area");
    }
    if (isRegistrationHour && !attributes.includes("_created_at")) {
      attributes.push("_created_at");
    }
    if (sortBy && !attributes.includes(sortBy)) {
      attributes.push(sortBy);
    }

    const payload = {
      type: "user",
    };

    const filterKeys = Object.keys(attrFilter);
    const filters = queryParams.filterOptions.attributes.filter((atr) =>
      filterKeys.includes(atr.key)
    );

    filters.forEach(({ key, type, filters }) => {
      if (type === "date") {
        const [from, to] = attrFilter[key];
        payload[key] = {
          $gte: new Date(from).toISOString(),
          $lte: new Date(to).toISOString(),
        };
      } else if (type === "number") {
        const { from, to } = attrFilter[key];
        payload[key] = {
          $gte: from,
          $lte: to,
        };
      } else if (filters) {
        payload[key] = {
          $in: attrFilter[key],
        };
      }
    });

    const userQuery = User.find(payload).select(attributes.join(" "));
    if (!topics || topics.length === 0) {
      userQuery.limit(limit).sort({ [sortBy]: sortingOrder });
    }

    const users = await userQuery.exec();

    if (!topics || topics.length === 0) {
      return users;
    }

    const userGroup = {};
    const userFromAreas = {};
    const registrationHour = {};
    const orderTiming = {};
    const orderFrequency = {
      0: { count: 0, orders: 0 },
      1: { count: 0, orders: 1 },
      2: { count: 0, orders: 2 },
      5: { count: 0, orders: 5 },
      10: { count: 0, orders: 10 },
      20: { count: 0, orders: 20 },
      30: { count: 0, orders: 30 },
      50: { count: 0, orders: 50 },
      75: { count: 0, orders: 75 },
    };
    const orderFromArea = {};

    const hubs = await Hub.find({}).exec();

    if (isUserFromArea || isRegistrationHour) {
      users.forEach((user) => {
        const { locations = [], _id, _created_at } = user.toJSON();

        if (isRegistrationHour) {
          const hours = new Date(_created_at).getHours();
          if (!registrationHour[hours]) {
            registrationHour[hours] = {
              count: 1,
              hours,
            };
          }
          registrationHour[hours].count += 1;
        }

        locations.forEach((location) => {
          const { area } = location;
          if (area) {
            if (!userFromAreas[area]) {
              userFromAreas[area] = {
                count: 0,
                area,
                users: [],
              };
            }
            userFromAreas[area].count += 1;
            // userFromAreas[area].users.push(_id);
          }
        });
      });
    }

    users.forEach((user) => {
      userGroup[user._id] = {
        ...user.toJSON(),
        orderCount: 0,
      };
    });

    if (isOrderTiming || isOrderFrequency || isOrderFromArea) {
      const userIds = users.map((user) => "_User$" + user._id);
      const orders = await Order.find({ _p_user: { $in: userIds } })
        .select(
          ` _id _created_at _p_user ${isOrderFromArea ? "customer_area" : ""}`
        )
        .sort({ _created_at: "asc" })
        .exec();

      orders.forEach((order) => {
        const { _created_at, _p_user, customer_area } = order.toJSON();
        if (!_p_user || !_created_at) {
          return;
        }

        const userId = _p_user.split("$")[1];
        const time = new Date(_created_at);
        const hours = time.getHours();

        if (isOrderTiming) {
          if (!orderTiming[hours]) {
            orderTiming[hours] = {
              count: 0,
              hours,
            };
          }

          orderTiming[hours].count += 1;
        }

        if (isOrderFromArea) {
          const area = customer_area.toLowerCase();
          if (!orderFromArea[area]) {
            orderFromArea[area] = {
              count: 0,
              area: area,
              users: [],
            };
          }

          orderFromArea[area].count += 1;
        }

        if (isOrderFrequency) {
          userGroup[userId].orderCount += 1;
        }
      });

      if (isOrderFrequency) {
        const counters = [0, 1, 2, 5, 10, 20, 30, 50, 75];
        for (let id in userGroup) {
          const { orderCount } = userGroup[id];
          let index = counters.findIndex((count) => orderCount <= count);
          if (index === -1) {
            index = counters.length - 1;
          }
          orderFrequency[counters[index]].count += 1;
        }
      }
    }

    const data = {};

    if (isOrderTiming) {
      data["orderTiming"] = Object.values(orderTiming);
    }

    if (isOrderFrequency) {
      data["orderFrequency"] = Object.values(orderFrequency);
    }

    if (isRegistrationHour) {
      data["registrationHour"] = Object.values(registrationHour);
    }

    const result = {};

    if (isUsers) {
      result["users"] = Object.values(userGroup);
    }

    // get percentages of data
    for (let key in data) {
      const values = data[key];
      const total = values.reduce(
        (acc: number, val: any) => acc + val.count,
        0
      );
      result[key] = values.map((val: any) => ({
        ...val,
        percentage: Number(((val.count / total) * 100).toFixed(2)),
      }));
    }

    if (isUserFromArea) {
      /**
       * User From Area
       */
      const userFromAreasCount = hubs.reduce((acc, hub) => {
        hub.areas.forEach(({ name }) => {
          acc += userFromAreas[name.toLowerCase()]?.count || 0;
        });
        return acc;
      }, 0);

      result["userFromAreas"] = hubs.map((hub) => {
        const { areas, name } = hub.toJSON();
        const data = {
          name,
          areas: areas.map(({ name }) => {
            return (userFromAreas[name.toLowerCase()] = userFromAreas[
              name.toLowerCase()
            ] || { area: name, count: 0 });
          }),
        };

        data.areas = data.areas.map((area: any) => ({
          ...area,
          percentage:
            area.count > 0
              ? Number(((area.count / userFromAreasCount) * 100).toFixed(2))
              : 0,
        }));

        return data;
      });
    }

    if (isOrderFromArea) {
      /**
       * Order From Area
       */
      const orderFromAreaCount = hubs.reduce((acc, hub) => {
        hub.areas.forEach(({ name }) => {
          acc += userFromAreas[name.toLowerCase()]?.count || 0;
        });
        return acc;
      }, 0);
      result["orderFromArea"] = hubs.map((hub) => {
        const { areas, name } = hub.toJSON();
        const data = {
          name,
          areas: areas.map(({ name }) => {
            return (userFromAreas[name.toLowerCase()] = orderFromArea[
              name.toLowerCase()
            ] || { area: name, count: 0 });
          }),
        };

        data.areas = data.areas.map((area: any) => ({
          ...area,
          percentage:
            area.count > 0
              ? Number(((area.count / orderFromAreaCount) * 100).toFixed(2))
              : 0,
        }));

        return data;
      });
    }

    return result;
  } catch (err) {
    console.log(err);
    return "error";
  }
}

export { getUserAnalytics };
