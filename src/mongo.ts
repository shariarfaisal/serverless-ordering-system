import { MongoClient } from "mongodb";
import {
  successActionResult,
  errorActionResult,
  isErrorResult,
  ErrorActionResult,
  SuccessActionResult,
} from "./utils";

class Mongo {
  client: any;
  db: any;

  constructor() {
    this.client = new MongoClient(process.env.databaseURI);
  }

  async connect(): Promise<ErrorActionResult | SuccessActionResult> {
    if (this.client && this.client.isConnected())
      return successActionResult(this.client);
    try {
      await this.client.connect();
      const dbName = String(process.env.databaseURI).split("/")[3]; // get Db name from env
      this.db = this.client.db(dbName);
      return successActionResult(this.client);
    } catch (er) {
      return errorActionResult(er);
    }
  }

  async getDB() {
    const connectResult: any = await this.connect();
    if (isErrorResult(connectResult))
      return errorActionResult(connectResult.error);

    const client = connectResult.result;
    return successActionResult(client.db());
  }
}

module.exports = new Mongo();
