import { writeAuditLog } from "@/lib/audit";
import { handleRoute, HttpError, ok } from "@/lib/api";
import { hashSessionToken, issueSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = await issueSession(user.id, user.role);
    const response = ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
      metadata: { sessionHash: hashSessionToken(token).slice(0, 12) },
      ip: request.headers.get("x-forwarded-for"),
    });
    return response;
  });
}
