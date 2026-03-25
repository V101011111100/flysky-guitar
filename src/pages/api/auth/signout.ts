import type { APIRoute } from "astro";
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
  cookies.delete("sb-session-type", { path: "/" });
  return redirect("/admin/login");
};
