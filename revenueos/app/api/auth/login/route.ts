import { handleRoute, HttpError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { hashSessionToken, issueSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { defaultPostLoginPath } from "@/lib/rbac";
import { getClientIp } from "@/lib/request";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function retryAfterSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = loginSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const ip = getClientIp(request);

    const limit = checkLoginRateLimit({ ip, email });
    if (!limit.allowed) {
      await writeAuditLog({
        action: "LOGIN_RATE_LIMITED",
        entityType: "User",
        metadata: { email, ipAllowed: limit.ipAllowed, accountAllowed: limit.accountAllowed },
        ip,
      });
      throw new HttpError(429, `Too many login attempts. Try again in ${retryAfterSeconds(limit.retryAfterMs)} seconds`);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !valid) {
      await writeAuditLog({
        actorId: user?.id ?? null,
        actorRole: user?.role ?? null,
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: user?.id ?? null,
        metadata: { email, reason: user ? "invalid_password" : "unknown_account" },
        ip,
      });
      throw new HttpError(401, "Invalid email or password");
    }

    const token = await issueSession(user.id, user.role);
    const redirectTo = defaultPostLoginPath(user.role);
    const response = ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirectTo,
    });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      metadata: { sessionHash: hashSessionToken(token).slice(0, 12), redirectTo },
      ip,
    });
    return response;
  });
}
