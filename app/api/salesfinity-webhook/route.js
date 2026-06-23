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
  try {
    const body = await request.json();

    const dispositionId = body?.disposition?.internal_id;
    const phoneNumber = body?.phone_number?.number;

    if (!dispositionId || !phoneNumber) {
      return Response.json({ error: 'Missing disposition.internal_id or phone_number.number' }, { status: 400 });
    }

    const leadStatus = DISPOSITION_MAP[dispositionId];
    if (!leadStatus) {
      return Response.json({ error: `Unknown disposition id: ${dispositionId}` }, { status: 400 });
    }

    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'HUBSPOT_API_KEY not configured' }, { status: 500 });
    }

    // Search HubSpot for contact by phone number
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: 'phone', operator: 'EQ', value: phoneNumber },
            ],
          },
          {
            filters: [
              { propertyName: 'mobilephone', operator: 'EQ', value: phoneNumber },
            ],
          },
        ],
        properties: ['hs_lead_status'],
        limit: 1,
      }),
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return Response.json({ error: `HubSpot search failed: ${err}` }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const contact = searchData.results?.[0];

    if (!contact) {
      return Response.json({ error: `No HubSpot contact found for phone: ${phoneNumber}` }, { status: 404 });
    }

    // Update hs_lead_status on matched contact
    const updateRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        properties: { hs_lead_status: leadStatus },
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return Response.json({ error: `HubSpot update failed: ${err}` }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
