// Vercel serverless function — proxy for RE/MAX CCA property feeds
// Usage: /api/properties?office=altitud|cero|all

const OFFICE_IDS = {
    altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
    cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

const BASE_URL = 'https://api.remax-cca.com/api/PropertiesPerOffice';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const office = (req.query.office || 'all').toLowerCase();

    try {
        let allProperties = [];

        if (office === 'all' || office === 'altitud') {
            const r = await fetch(`${BASE_URL}/${OFFICE_IDS.altitud}`);
            if (r.ok) {
                const data = await r.json();
                allProperties.push(...data.map(p => ({ ...p, _office: 'altitud' })));
            }
        }

        if (office === 'all' || office === 'cero') {
            const r = await fetch(`${BASE_URL}/${OFFICE_IDS.cero}`);
            if (r.ok) {
                const data = await r.json();
                allProperties.push(...data.map(p => ({ ...p, _office: 'cero' })));
            }
        }

        // Slim down the response — only send fields the frontend needs
        const slim = allProperties.map(p => ({
            id: p.ListingId,
            key: p.ListingKey,
            type_en: p.PropertyTypeName_en,
            type_es: p.PropertyTypeName_es,
            contract_en: p.ContractType_en,
            contract_es: p.ContractType_es,
            title_en: p.ListingTitle_en,
            title_es: p.ListingTitle_es,
            status: p.Status,
            price: p.ListPrice,
            currency: p.CurrencyListPrice,
            lat: parseFloat(p.Latitude) || null,
            lng: parseFloat(p.Longitude) || null,
            address: p.UnparsedAddress,
            location: p.Location,
            state: p.StateDepProv,
            bedrooms: p.BedroomsTotal,
            bathrooms: p.BathroomsFull,
            stories: p.Stories,
            lotSize: p.LotSizeArea,
            lotUnits: p.LotSizeUnits,
            constructionSize: p.ConstructionSize,
            pool: p.PoolPrivate === 'Y',
            garage: p.Garage === 'Y',
            garageSpaces: p.GarageSpaces,
            furnished: p.Furnishedyn === 'Y',
            gated: p.GatedCommunity === 'Y',
            view: p.Viewyn === 'Y',
            cooling: p.Cooling === 'Y',
            image: p.Images ? p.Images.split('|')[0] : null,
            images: p.Images ? p.Images.split('|').slice(0, 5) : [],
            agent: `${p.FirstName} ${p.LastName}`,
            office: p._office,
            officeName: p.OfficeName,
            listingDate: p.ListingContractDate,
        }));

        res.status(200).json({ count: slim.length, properties: slim });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch properties', detail: err.message });
    }
}
