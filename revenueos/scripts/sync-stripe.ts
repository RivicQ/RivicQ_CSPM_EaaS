import { syncCatalogueToStripe } from "../lib/stripe";

try {
  process.loadEnvFile(".env");
} catch {
  void 0;
}

const result = await syncCatalogueToStripe();
console.log("Stripe catalogue sync complete", result);
