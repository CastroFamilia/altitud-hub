// Vercel serverless function — proxy for RE/MAX CCA agent feeds
// Usage: /api/agents?office=altitud|cero|all

const OFFICE_IDS = {
    altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
    cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

const BASE_URL = 'https://api.remax-cca.com/api/AgentsPerOffice';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=3600'); // cache 1 hour

    const office = (req.query.office || 'all').toLowerCase();

    try {
        let allAgents = [];

        if (office === 'all' || office === 'altitud') {
            const r = await fetch(`${BASE_URL}/${OFFICE_IDS.altitud}`);
            if (r.ok) {
                const data = await r.json();
                allAgents.push(...data.map(a => ({ ...a, _office: 'altitud', _officeName: 'RE/MAX Altitud' })));
            }
        }

        if (office === 'all' || office === 'cero') {
            const r = await fetch(`${BASE_URL}/${OFFICE_IDS.cero}`);
            if (r.ok) {
                const data = await r.json();
                allAgents.push(...data.map(a => ({ ...a, _office: 'cero', _officeName: 'RE/MAX Altitud Cero' })));
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

        res.status(200).json({ count: slim.length, agents: slim });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch agents', detail: err.message });
    }
}
