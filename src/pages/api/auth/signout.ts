import type { APIRoute } from "astro";
import { ADMIN_SESSION_COOKIE, ensureSameOrigin, PENDING_MFA_REMEMBER_COOKIE } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
  cookies.delete("sb-session-type", { path: "/" });
  cookies.delete(ADMIN_SESSION_COOKIE, { path: "/" });
  cookies.delete(PENDING_MFA_REMEMBER_COOKIE, { path: "/" });
  return redirect("/admin/login");
};
