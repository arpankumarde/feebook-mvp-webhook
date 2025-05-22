import { Cashfree, CFEnvironment } from "cashfree-pg";
import dotenv from "dotenv";
dotenv.config();

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_APP_SECRET
);

export default cashfree;
