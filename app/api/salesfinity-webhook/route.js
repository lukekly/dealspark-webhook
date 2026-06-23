export async function POST(request) {
  const body = await request.json();
  console.log('[webhook] raw payload:', JSON.stringify(body, null, 2));
  return Response.json({ received: true });
}
