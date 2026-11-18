import { HttpError } from "./api";
import { requireStaff } from "./auth";
import type { AdminApiResource, AdminSection } from "./rbac";
import { canAccessAdminApi, canAccessAdminSection } from "./rbac";

export async function requireAdminSectionAccess(section: AdminSection) {
  const user = await requireStaff();
  if (!canAccessAdminSection(user.role, section)) {
    throw new HttpError(403, "Insufficient role permissions");
  }
  return user;
}

export async function requireAdminApiAccess(resource: AdminApiResource) {
  const user = await requireStaff();
  if (!canAccessAdminApi(user.role, resource)) {
    throw new HttpError(403, "Insufficient role permissions");
  }
  return user;
}
