import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cashfree from "./lib/cfpg_server.js";
import db from "./lib/db.js";

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

// Custom middleware to capture the raw body before any parsing happens
app.use((req, res, next) => {
  const chunks = [];

  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks);

    // Try to parse as JSON if it's a JSON content type
    if (
      req.headers["content-type"] &&
      req.headers["content-type"].includes("application/json")
    ) {
      try {
        req.body = JSON.parse(req.rawBody.toString());
      } catch (e) {
        // If parsing fails, req.body will be set by the next middleware
      }
    }

    next();
  });
});

app.use(express.json({ type: "*/*" }));
app.use(cors());
// app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  console.log("==================================");
  res.json({
    message: "Hello World",
  });
});

app.post("/webhook", async (req, res) => {
  // show all headers
  // console.log("HEADERS: ", req.headers);

  // show all body
  // console.log("BODY: ", req.body);

  // show all raw body
  // console.log("RAW BODY: ", req.rawBody);

  try {
    const webhookSignature = req.headers["x-webhook-signature"];
    const webhookTimestamp = req.headers["x-webhook-timestamp"];
    const wbody = req.body;
    const webhookRawBody = req.rawBody;

    if (!webhookSignature || !webhookTimestamp || !webhookRawBody) {
      console.log("Webhook Signature or Timestamp or Raw Body not found");
      res
        .status(400)
        .send("Webhook Signature or Timestamp or Raw Body not found");
      return;
    }

    const ok = cashfree.PGVerifyWebhookSignature(
      webhookSignature,
      webhookRawBody,
      webhookTimestamp
    );

    if (
      wbody.data.order.order_tags.consumerId &&
      wbody.data.order.order_tags.consumerId.length > 0
    ) {
      await db.transaction.create({
        data: {
          externalPaymentId: wbody.data.payment.cf_payment_id,
          amount: wbody.data.payment.payment_amount,
          status: wbody.data.payment.payment_status,
          paymentTime: wbody.data.payment.payment_time,
          paymentCurrency: wbody.data.payment.payment_currency,
          paymentMessage: wbody.data.payment.payment_message,
          bankReference: wbody.data.payment.bank_refernce,
          paymentMethod: wbody.data.payment.payment_method,
          paymentGroup: wbody.data.payment.payment_group,
          paymentSurcharge: wbody.data.payment.payment_surcharge,
          paymentGatewayDetails: wbody.data.payment_gateway_details,
          paymentOffers: wbody.data.payment_offers ?? [],
          errorDetails: wbody.data.error_details,
          terminalDetails: wbody.data.terminal_details,
          webhookResponse: wbody,
          webhookAttempt: Number(req.headers["x-webhook-attempt"]),
          webhookSignature: webhookSignature,
          webhookTimestamp: new Date(Number(webhookTimestamp)),
          webhookVersion: req.headers["x-webhook-version"],
          idempotencyKey: req.headers["x-idempotency-key"],
          order: {
            connect: {
              id: wbody.data.order.order_id,
            },
          },
          feePlan: {
            connect: {
              id: wbody.data.order.order_tags.feePlanId,
            },
          },
          consumer: {
            connect: {
              id: wbody.data.order.order_tags.consumerId,
            },
          },
        },
      });
    } else {
      // console.log(new Date(Number(webhookTimestamp)));
      await db.transaction.create({
        data: {
          externalPaymentId: wbody.data.payment.cf_payment_id,
          amount: wbody.data.payment.payment_amount,
          status: wbody.data.payment.payment_status,
          paymentTime: wbody.data.payment.payment_time,
          paymentCurrency: wbody.data.payment.payment_currency,
          paymentMessage: wbody.data.payment.payment_message,
          bankReference: wbody.data.payment.bank_refernce,
          paymentMethod: wbody.data.payment.payment_method,
          paymentGroup: wbody.data.payment.payment_group,
          paymentSurcharge: wbody.data.payment.payment_surcharge,
          paymentGatewayDetails: wbody.data.payment_gateway_details,
          paymentOffers: wbody.data.payment_offers ?? [],
          errorDetails: wbody.data.error_details,
          terminalDetails: wbody.data.terminal_details,
          webhookResponse: wbody,
          webhookAttempt: Number(req.headers["x-webhook-attempt"]),
          webhookSignature: webhookSignature,
          webhookTimestamp: new Date(Number(webhookTimestamp)),
          webhookVersion: req.headers["x-webhook-version"],
          idempotencyKey: req.headers["x-idempotency-key"],
          order: {
            connect: {
              id: wbody.data.order.order_id,
            },
          },
          feePlan: {
            connect: {
              id: wbody.data.order.order_tags.feePlanId,
            },
          },
        },
      });
    }

    console.log("Type: ", ok.type);
    // console.log("Webhook Signature Verified: ", ok);

    res.status(200).send();
  } catch (err) {
    console.log("Error Caught: ", err.message);
    console.log("Error Full: ", err);
    res.status(400).end();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
