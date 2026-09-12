import { Router } from "express";
import { prisma } from "../index";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../lib/stripe";
import type Stripe from "stripe";

const router = Router();

// Mounted with express.raw() (see index.ts) so req.body is the raw byte
// buffer Stripe's signature check needs — must run before express.json().
router.post("/", async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook received but Stripe is not configured");
    return res.status(503).json({ error: "Stripe is not configured on the server" });
  }

  const signature = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      console.error("Stripe checkout session completed with missing metadata", session.id);
      return res.status(200).json({ received: true });
    }

    // Webhooks can be delivered more than once — skip if we've already
    // recorded this checkout session.
    const existing = await prisma.subscription.findUnique({
      where: { providerSubscriptionId: session.id }
    });
    if (existing) {
      return res.status(200).json({ received: true });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      console.error("Stripe checkout session completed for unknown plan", planId);
      return res.status(200).json({ received: true });
    }

    const startsAt = new Date();
    const expiresAt = plan.durationHours
      ? new Date(startsAt.getTime() + plan.durationHours * 60 * 60 * 1000)
      : new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: "active",
        startedAt: startsAt,
        expiresAt,
        provider: "stripe",
        providerSubscriptionId: session.id
      }
    });

    await prisma.userEntitlement.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        featureKey: plan.domain,
        enabled: true,
        startsAt,
        expiresAt
      }
    });
  }

  res.status(200).json({ received: true });
});

export default router;
