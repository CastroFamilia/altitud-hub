const OFFICE_IDS = {
  altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
  cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

const BASE_URL = 'https://api.remax-cca.com/api/AgentsPerOffice';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const office = (searchParams.get('office') || 'all').toLowerCase();

  try {
    let allAgents = [];

    if (office === 'all' || office === 'altitud') {
      const r = await fetch(`${BASE_URL}/${OFFICE_IDS.altitud}`, {
        next: { revalidate: 3600 } // Cache 1 hour
      });
      if (r.ok) {
        const data = await r.json();
        allAgents.push(...data.map(a => ({ ...a, _office: 'altitud', _officeName: 'REMAX Altitud' })));
      }
    }

    if (office === 'all' || office === 'cero') {
      const r = await fetch(`${BASE_URL}/${OFFICE_IDS.cero}`, {
        next: { revalidate: 3600 }
      });
      if (r.ok) {
        const data = await r.json();
        allAgents.push(...data.map(a => ({ ...a, _office: 'cero', _officeName: 'REMAX Altitud Cero' })));
      }
    }

    const slim = allAgents
      .filter(a => a.AssociateStatus_en === 'Active')
      .map(a => ({
        id: a.AssociateID,
        name: `${a.FirstName} ${a.LastName}`.trim(),
        firstName: a.FirstName,
        lastName: a.LastName,
        phone: a.DirectPhone || a.Mobile || '',
        email: a.RemaxEmail || a.NonRemaxEmail || '',
        photo: a.UrlImg || '',
        title: a.Title,
        titleEs: a.TitleEs,
        office: a._office,
        officeName: a._officeName,
        lang: a.Lang,
      }));

    return Response.json({ count: slim.length, agents: slim });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch agents', detail: err.message },
      { status: 500 }
    );
  }
}
