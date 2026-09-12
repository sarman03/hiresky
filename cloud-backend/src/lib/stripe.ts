import Stripe from "stripe";

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const WEB_APP_URL = process.env.WEB_APP_URL || "http://localhost:3000";

// Stripe isn't required for the rest of the app to run, so we only fail the
// specific billing routes that need it (checked via `stripe` being null)
// rather than crashing the whole server when keys aren't set yet.
export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
