import express from "express";
import cors from "cors";
import cashfree from "./lib/cfpg_server.js";
import dotenv from "dotenv";
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
    message: "Server is running",
  });
});

app.post("/webhook", function (req, res) {
  // show all headers
  console.log("HEADERS: ", req.headers);

  // show all body
  // console.log("BODY: ", req.body);

  // show all raw body
  // console.log("RAW BODY: ", req.rawBody);

  try {
    const webhookSignature = req.headers["x-webhook-signature"];
    const webhookTimestamp = req.headers["x-webhook-timestamp"];
    const webhookBody = req.rawBody;

    if (!webhookSignature || !webhookTimestamp || !webhookBody) {
      console.log("Webhook Signature or Timestamp or Raw Body not found");
      res
        .status(400)
        .send("Webhook Signature or Timestamp or Raw Body not found");
      return;
    }

    const ok = cashfree.PGVerifyWebhookSignature(
      webhookSignature,
      webhookBody,
      webhookTimestamp
    );

    console.log("Type: ", ok.type);
    console.log("Webhook Signature Verified: ", ok);
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
