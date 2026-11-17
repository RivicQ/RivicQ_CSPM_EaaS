import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { fromMinorUnits, toMinorUnits } from "../lib/money";
import { firstTenCustomerPlan } from "../lib/revenue";

const prisma = new PrismaClient();
const priceBookVersion = "2026-11-base-v1";
const fxSource = "manual-seed-reference";

const exchangeRates = [
  { baseCurrency: "EUR", quoteCurrency: "INR", rate: "100.00000000" },
  { baseCurrency: "EUR", quoteCurrency: "SGD", rate: "1.44000000" },
  { baseCurrency: "EUR", quoteCurrency: "JPY", rate: "170.00000000" },
  { baseCurrency: "EUR", quoteCurrency: "AUD", rate: "1.65000000" },
];

const products = [
  {
    code: "saas_startup",
    name: "RivicQ Startup",
    description: "SaaS plan for early cryptographic inventory and policy evidence.",
    kind: "SAAS",
    billingInterval: "MONTHLY",
    prices: [
      { currency: "EUR", interval: "MONTHLY", amount: "99" },
      { currency: "EUR", interval: "ANNUAL", amount: "1188" },
      { currency: "INR", interval: "MONTHLY", amount: "4999" },
      { currency: "INR", interval: "ANNUAL", amount: "59988" },
    ],
  },
  {
    code: "saas_growth",
    name: "RivicQ Growth",
    description: "SaaS plan for growing teams with repeatable CBOM evidence.",
    kind: "SAAS",
    billingInterval: "MONTHLY",
    prices: [
      { currency: "EUR", interval: "MONTHLY", amount: "399" },
      { currency: "EUR", interval: "ANNUAL", amount: "4788" },
      { currency: "INR", interval: "MONTHLY", amount: "19999" },
      { currency: "INR", interval: "ANNUAL", amount: "239988" },
    ],
  },
  {
    code: "saas_professional",
    name: "RivicQ Professional",
    description: "SaaS plan for regulated estates and multi-team operations.",
    kind: "SAAS",
    billingInterval: "MONTHLY",
    prices: [
      { currency: "EUR", interval: "MONTHLY", amount: "999" },
      { currency: "EUR", interval: "ANNUAL", amount: "11988" },
      { currency: "INR", interval: "MONTHLY", amount: "49999" },
      { currency: "INR", interval: "ANNUAL", amount: "599988" },
    ],
  },
  {
    code: "saas_enterprise",
    name: "RivicQ Enterprise",
    description: "Custom enterprise platform agreement with annual contracting.",
    kind: "SAAS",
    billingInterval: "CUSTOM",
    prices: [
      { currency: "EUR", interval: "ANNUAL", amount: "25000" },
      { currency: "INR", interval: "ANNUAL", amount: "2000000" },
    ],
  },
  {
    code: "audit_discovery",
    name: "PQC Discovery Assessment",
    description: "Discovery assessment for cryptographic assets and initial exposure.",
    kind: "AUDIT",
    billingInterval: "ONE_TIME",
    prices: [
      { currency: "EUR", interval: "ONE_TIME", amount: "2500" },
      { currency: "INR", interval: "ONE_TIME", amount: "150000" },
    ],
  },
  {
    code: "audit_readiness",
    name: "PQC Readiness Audit",
    description: "Readiness audit with findings, evidence, and migration priorities.",
    kind: "AUDIT",
    billingInterval: "ONE_TIME",
    prices: [
      { currency: "EUR", interval: "ONE_TIME", amount: "7500" },
      { currency: "INR", interval: "ONE_TIME", amount: "500000" },
    ],
  },
  {
    code: "audit_enterprise",
    name: "Enterprise PQC Assessment",
    description: "Enterprise assessment; published amount is the range minimum and custom quotations are required above it.",
    kind: "AUDIT",
    billingInterval: "CUSTOM",
    prices: [
      { currency: "EUR", interval: "ONE_TIME", amount: "15000" },
      { currency: "INR", interval: "ONE_TIME", amount: "800000" },
    ],
  },
  {
    code: "audit_full_estate",
    name: "Full Cryptographic Estate Audit",
    description: "Full-estate audit; published amount is the range minimum and custom quotations are required above it.",
    kind: "AUDIT",
    billingInterval: "CUSTOM",
    prices: [
      { currency: "EUR", interval: "ONE_TIME", amount: "30000" },
      { currency: "INR", interval: "ONE_TIME", amount: "1500000" },
    ],
  },
  {
    code: "consult_migration_strategy",
    name: "Cryptographic Migration Strategy",
    description: "Migration strategy engagement; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "5000" }],
  },
  {
    code: "consult_crypto_agility",
    name: "Crypto-Agility Architecture",
    description: "Crypto-agility architecture engagement; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "7500" }],
  },
  {
    code: "consult_implementation",
    name: "PQC Implementation Support",
    description: "Implementation support engagement; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "10000" }],
  },
  {
    code: "consult_tls_pki",
    name: "TLS / PKI Migration Support",
    description: "TLS and PKI migration support; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "10000" }],
  },
  {
    code: "consult_enterprise_programme",
    name: "Enterprise Migration Programme",
    description: "Enterprise migration programme; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "25000" }],
  },
  {
    code: "consult_large_programme",
    name: "Large-Scale Migration Programme",
    description: "Large-scale migration programme; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "100000" }],
  },
  {
    code: "consult_architecture_day",
    name: "Security Architecture Consulting",
    description: "Daily architecture consulting rate; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "1000" }],
  },
  {
    code: "consult_workshop",
    name: "Technical Workshop",
    description: "Focused technical workshop; published amount is the range minimum.",
    kind: "CONSULTING",
    billingInterval: "ONE_TIME",
    prices: [{ currency: "EUR", interval: "ONE_TIME", amount: "1500" }],
  },
  {
    code: "support_basic",
    name: "Basic Platform Support",
    description: "Annual basic platform support.",
    kind: "SUPPORT",
    billingInterval: "ANNUAL",
    prices: [{ currency: "EUR", interval: "ANNUAL", amount: "2500" }],
  },
  {
    code: "support_professional",
    name: "Professional Support",
    description: "Annual professional support.",
    kind: "SUPPORT",
    billingInterval: "ANNUAL",
    prices: [{ currency: "EUR", interval: "ANNUAL", amount: "5000" }],
  },
  {
    code: "support_enterprise",
    name: "Enterprise Support",
    description: "Annual enterprise support; published amount is the range minimum.",
    kind: "SUPPORT",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ANNUAL", amount: "10000" }],
  },
  {
    code: "support_reassessment",
    name: "Quarterly PQC Reassessment",
    description: "Quarterly reassessment; published amount is the range minimum.",
    kind: "SUPPORT",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ANNUAL", amount: "10000" }],
  },
  {
    code: "support_inventory",
    name: "Managed Cryptographic Inventory",
    description: "Managed inventory service; published amount is the range minimum.",
    kind: "SUPPORT",
    billingInterval: "CUSTOM",
    prices: [{ currency: "EUR", interval: "ANNUAL", amount: "15000" }],
  },
];

async function seedExchangeRates() {
  for (const rate of exchangeRates) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency_source_effectiveAt: {
          baseCurrency: rate.baseCurrency,
          quoteCurrency: rate.quoteCurrency,
          source: fxSource,
          effectiveAt: new Date("2026-11-01T00:00:00.000Z"),
        },
      },
      create: {
        ...rate,
        source: fxSource,
        effectiveAt: new Date("2026-11-01T00:00:00.000Z"),
      },
      update: { rate: rate.rate },
    });
  }
}

async function seedProducts() {
  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        kind: item.kind as never,
        billingInterval: item.billingInterval as never,
        defaultCurrency: item.prices[0].currency,
        active: true,
      },
      update: {
        name: item.name,
        description: item.description,
        kind: item.kind as never,
        billingInterval: item.billingInterval as never,
      },
    });

    for (const price of item.prices) {
      const savedPrice = await prisma.price.upsert({
        where: {
          productId_currency_interval_priceBookVersion: {
            productId: product.id,
            currency: price.currency,
            interval: price.interval as never,
            priceBookVersion,
          },
        },
        create: {
          productId: product.id,
          currency: price.currency,
          interval: price.interval as never,
          unitAmount: toMinorUnits(price.amount, price.currency),
          priceBookVersion,
          active: true,
        },
        update: {
          unitAmount: toMinorUnits(price.amount, price.currency),
          active: true,
        },
      });

      const countries = price.currency === "EUR" ? ["DE", "EU"] : price.currency === "INR" ? ["IN"] : [];
      for (const country of countries) {
        await prisma.regionalPrice.upsert({
          where: {
            priceId_country_priceBookVersion: {
              priceId: savedPrice.id,
              country,
              priceBookVersion,
            },
          },
          create: {
            priceId: savedPrice.id,
            country,
            currency: price.currency,
            unitAmount: savedPrice.unitAmount,
            taxCode: country === "DE" ? "VAT-DE-19" : country === "IN" ? "GST-IN-18" : null,
            priceBookVersion,
            active: true,
          },
          update: { unitAmount: savedPrice.unitAmount, active: true },
        });
      }
    }
  }
}

async function seedReferencePrices() {
  const rates: Record<string, string> = {
    SGD: "1.44",
    JPY: "170",
    AUD: "1.65",
  };
  for (const code of ["saas_startup", "saas_growth", "saas_professional"]) {
    const product = await prisma.product.findUnique({ where: { code }, include: { prices: true } });
    if (!product) continue;
    const eurPrices = product.prices.filter((price) => price.currency === "EUR");
    for (const eurPrice of eurPrices) {
      for (const [currency, rate] of Object.entries(rates)) {
        const major = Number(fromMinorUnits(eurPrice.unitAmount, "EUR"));
        const converted = toMinorUnits((major * Number(rate)).toString(), currency);
        await prisma.price.upsert({
          where: {
            productId_currency_interval_priceBookVersion: {
              productId: product.id,
              currency,
              interval: eurPrice.interval,
              priceBookVersion,
            },
          },
          create: {
            productId: product.id,
            currency,
            interval: eurPrice.interval,
            unitAmount: converted,
            priceBookVersion,
            active: true,
          },
          update: { unitAmount: converted, active: true },
        });
      }
    }
  }
}

async function seedTaxAndAdmin() {
  const taxConfigs = [
    { country: "DE", taxCode: "VAT-DE-19", rateBps: 1900 },
    { country: "IN", taxCode: "GST-IN-18", rateBps: 1800 },
    { country: "SG", taxCode: "GST-SG-REVIEW", rateBps: 0 },
    { country: "JP", taxCode: "JCT-JP-REVIEW", rateBps: 0 },
    { country: "AU", taxCode: "GST-AU-REVIEW", rateBps: 0 },
  ];
  for (const config of taxConfigs) {
    await prisma.taxConfiguration.upsert({
      where: { country: config.country },
      create: config,
      update: config,
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@rivicq.test";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error("SEED_ADMIN_PASSWORD is required in production");
  }
  const passwordHash = await hash(password ?? "LocalDevOnly123!", 12);
  const organization = await prisma.organization.upsert({
    where: { name: "RivicQ GmbH" },
    create: { name: "RivicQ GmbH", country: "DE" },
    update: {},
  });
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "RivicQ Founder",
      passwordHash,
      role: "FOUNDER",
      organizationId: organization.id,
    },
    update: { passwordHash, role: "FOUNDER" },
  });
}

async function seedPlanningTargets() {
  const periodStart = new Date("2026-01-01T00:00:00.000Z");
  const periodEnd = new Date("2026-12-31T23:59:59.999Z");
  for (const [currency, target] of Object.entries(firstTenCustomerPlan.targets)) {
    const description = `${currency} first-10-customer planning target`;
    const existing = await prisma.revenueRecord.findFirst({ where: { description } });
    if (existing) continue;
    await prisma.revenueRecord.create({
      data: {
        category: "RECURRING",
        kind: "FORECAST",
        amount: target.combined,
        currency,
        periodStart,
        periodEnd,
        scenario: "BASE",
        description,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "first-10-customer-plan" },
    create: { key: "first-10-customer-plan", value: firstTenCustomerPlan },
    update: { value: firstTenCustomerPlan },
  });
}

async function main() {
  await seedExchangeRates();
  await seedProducts();
  await seedReferencePrices();
  await seedTaxAndAdmin();
  await seedPlanningTargets();
  console.log("RevenueOS seed complete");
}

main()
  .catch((error) => {
    console.error("RevenueOS seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
