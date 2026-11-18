import { Prisma } from "@prisma/client";
import { handleRoute, HttpError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { buildTenantSafeOrganizationName, registrationResponse } from "@/lib/registration";
import { registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = registerSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "Registration could not be completed with those details");
    }

    const passwordHash = await hashPassword(body.password);
    const organizationName = buildTenantSafeOrganizationName(body.organization, email);
    const ip = getClientIp(request);

    const result = await prisma
      .$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: organizationName, country: body.country },
        });
        const customer = await tx.customer.create({
          data: {
            name: body.organization ?? body.name,
            email,
            country: body.country,
            currency: body.country.toUpperCase() === "IN" ? "INR" : "EUR",
            status: "LEAD",
            organizationId: organization.id,
          },
        });
        const user = await tx.user.create({
          data: {
            email,
            name: body.name,
            passwordHash,
            role: "CUSTOMER",
            organizationId: organization.id,
            customerId: customer.id,
          },
        });
        return { user };
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new HttpError(409, "Registration could not be completed with those details");
        }
        throw error;
      });

    await writeAuditLog({
      actorId: result.user.id,
      actorRole: "CUSTOMER",
      action: "REGISTER",
      entityType: "User",
      entityId: result.user.id,
      metadata: { emailVerificationRequired: true },
      ip,
    });

    return ok(registrationResponse(), 201);
  });
}
