import { Router } from "express";
import { prisma } from "../index";
import { authenticate } from "../middleware/auth.middleware";
import { stripe, WEB_APP_URL } from "../lib/stripe";

const router = Router();

// Get available plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true }
    });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a Stripe Checkout Session for a plan. The subscription/entitlement
// is only ever granted from the signed `checkout.session.completed` webhook
// (see billing.webhook.ts) — never from this endpoint directly — so a client
// can't self-grant a plan without actually paying.
router.post("/checkout/create-session", authenticate, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured on the server" });
    }

    const userId = req.user!.userId;
    const { planId } = req.body;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: { name: plan.name },
            unit_amount: Math.round(Number(plan.price) * 100)
          },
          quantity: 1
        }
      ],
      metadata: { userId, planId: plan.id },
      success_url: `${WEB_APP_URL}/pricing?checkout=success`,
      cancel_url: `${WEB_APP_URL}/pricing?checkout=cancelled`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
