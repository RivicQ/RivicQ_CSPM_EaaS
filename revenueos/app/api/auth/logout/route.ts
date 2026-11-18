import { cookies } from "next/headers";
import { handleRoute, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getSession, hashSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await getSession();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }
    if (user) {
      await writeAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: "LOGOUT",
        entityType: "User",
        entityId: user.id,
        ip: getClientIp(request),
      });
    }
    const response = ok({ loggedOut: true });
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  });
}
