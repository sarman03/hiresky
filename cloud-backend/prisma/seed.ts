import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

// There's no actual behavioral difference between the TECHNICAL and CODING
// domains anywhere in the app today (same AI assistant, same prompt, and the
// overlay client only ever starts sessions as "TECHNICAL" regardless), so we
// sell a single plan that covers both rather than pretending they're
// different products.
const plans = [
  { name: "Technical Day", domain: "TECHNICAL", durationHours: 24, price: 299, currency: "INR" },
  { name: "Technical Monthly", domain: "TECHNICAL", durationHours: null, price: 1999, currency: "INR" }
];

async function main() {
  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.plan.update({ where: { id: existing.id }, data: { ...plan, isActive: true } });
    } else {
      await prisma.plan.create({ data: plan });
    }
  }

  // HR and standalone CODING plans are dropped from the product. Deactivate
  // rather than delete so any existing Subscription/UserEntitlement history
  // referencing them stays intact.
  await prisma.plan.updateMany({ where: { domain: { in: ["HR", "CODING"] } }, data: { isActive: false } });

  console.log("Plans seeded:", plans.map(p => p.name).join(", "));
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
