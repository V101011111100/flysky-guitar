export function ensureSameOrigin(request: Request): { ok: true } | { ok: false; response: Response } {
  const origin = request.headers.get('origin');

  // Non-browser callers may not send Origin; do not block them by default.
  if (!origin) {
    return { ok: true };
  }

  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ success: false, error: 'Invalid origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { ok: true };
}
