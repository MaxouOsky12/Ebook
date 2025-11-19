// server.js
import express from "express";
import fetch from "node-fetch";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // images et PDF

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_ENV === "live" 
  ? "https://api.paypal.com" 
  : "https://api.sandbox.paypal.com";

// Génère token PayPal
async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json();
  return data.access_token;
}

// Création d'une commande PayPal
app.post("/create-order", async (req, res) => {
  const { price = "9.00", title = "Mon eBook" } = req.body;
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "EUR", value: price }, description: title }]
    })
  });
  const data = await response.json();
  res.json(data);
});

// Capture du paiement et livraison du PDF
app.post("/capture-order", async (req, res) => {
  const { orderID } = req.body;
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  });
  const data = await response.json();

  if (data.status === "COMPLETED") {
    res.json({ success: true, downloadU
