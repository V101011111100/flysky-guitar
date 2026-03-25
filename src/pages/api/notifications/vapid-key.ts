import type { APIRoute } from 'astro';

const VAPID_PUBLIC_KEY = import.meta.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};
