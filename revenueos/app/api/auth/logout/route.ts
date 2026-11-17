import { cookies } from "next/headers";
import { handleRoute, ok } from "@/lib/api";
import { hashSessionToken, requireUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  return handleRoute(async () => {
    const user = await requireUser();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }
    const response = ok({ loggedOut: true });
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  });
}
