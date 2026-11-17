import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      prices: {
        where: { active: true },
        include: { regionalPrices: { where: { active: true } } },
        orderBy: [{ currency: "asc" }, { interval: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return ok({
    priceBookVersion: "2026-11-base-v1",
    products: products.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description,
      kind: product.kind,
      billingInterval: product.billingInterval,
      prices: product.prices.map((price) => ({
        id: price.id,
        currency: price.currency,
        interval: price.interval,
        unitAmount: price.unitAmount,
        display: formatMoney(price.unitAmount, price.currency),
        priceBookVersion: price.priceBookVersion,
        regionalPrices: price.regionalPrices.map((regional) => ({
          country: regional.country,
          currency: regional.currency,
          unitAmount: regional.unitAmount,
          display: formatMoney(regional.unitAmount, regional.currency),
          taxCode: regional.taxCode,
        })),
      })),
    })),
  });
}
