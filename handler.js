const app = require("./dist/app.js");

module.exports.handler = serverless(app);
