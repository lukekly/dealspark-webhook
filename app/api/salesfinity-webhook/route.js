const DISPOSITION_MAP = {
  1:  'Meeting Booked',
  2:  'Do Not Contact',
  3:  'Not Interested',
  4:  'Referral',
  5:  'Do Not Contact',
  6:  'Call back later',
  7:  'Reach Out In 6 Months',
  8:  'Send an email',
  9:  'Do Not Contact',
  10: 'Attempting to Contact',
  11: 'Attempting to Contact',
  12: 'Attempting to Contact',
  13: 'Unreachable',
  14: 'Attempting to Contact',
};

export async function POST(request) {
  const body = await request.json();
  const { payload } = body;
  const dispositionId = payload?.disposition?.internal_id;
  const contactId = payload?.contact?.crm_id;
  const newStatus = DISPOSITION_MAP[dispositionId];

  if (!contactId || !newStatus) {
    return Response.json({ error: 'Missing contactId or disposition' }, { status: 400 });
  }

  const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties: { hs_lead_status: newStatus } }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[webhook] HubSpot update failed:', err);
    return Response.json({ error: err }, { status: 500 });
  }

  console.log(`[webhook] Updated contact ${contactId} → ${newStatus}`);
  return Response.json({ success: true });
}
