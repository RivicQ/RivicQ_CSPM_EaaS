import { createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { HttpError } from "./api";
import { prisma } from "./db";
import { getSessionSecret, isStaffRole } from "./env";

export const SESSION_COOKIE = "rivicq_revenueos_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  customerId: string | null;
};

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSessionToken(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(getSessionSecret()));
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueSession(userId: string, role: string) {
  const token = await createSessionToken(userId, role);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(getSessionSecret()));
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, customerId: true },
  });
  return user ? { ...user, role: user.role } : null;
}

export async function requireUser() {
  const user = await getSession();
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

export async function requireStaff(allowedRoles?: string[]) {
  const user = await requireUser();
  if (!isStaffRole(user.role)) throw new HttpError(403, "Staff access required");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new HttpError(403, "Insufficient role permissions");
  }
  return user;
}
