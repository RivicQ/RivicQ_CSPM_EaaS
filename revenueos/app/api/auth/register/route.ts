import { Prisma } from "@prisma/client";
import { handleRoute, HttpError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword, issueSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/env";
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
    const result = await prisma
      .$transaction(async (tx) => {
        let organizationId: string | null = null;
        if (body.organization) {
          const organization = await tx.organization.upsert({
            where: { name: body.organization },
            create: { name: body.organization, country: body.country },
            update: {},
          });
          organizationId = organization.id;
        }
        const customer = await tx.customer.create({
          data: {
            name: body.organization ?? body.name,
            email,
            country: body.country,
            currency: body.country.toUpperCase() === "IN" ? "INR" : "EUR",
            status: "LEAD",
            organizationId,
          },
        });
        const user = await tx.user.create({
          data: {
            email,
            name: body.name,
            passwordHash,
            role: "CUSTOMER",
            organizationId,
            customerId: customer.id,
          },
        });
        return { user, customer };
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new HttpError(409, "Registration could not be completed with those details");
        }
        throw error;
      });

    const token = await issueSession(result.user.id, result.user.role);
    const response = ok({ user: { id: result.user.id, email: result.user.email, role: result.user.role } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    await writeAuditLog({
      actorId: result.user.id,
      actorRole: "CUSTOMER",
      action: "REGISTER",
      entityType: "User",
      entityId: result.user.id,
      ip: request.headers.get("x-forwarded-for"),
    });
    return response;
  });
}
