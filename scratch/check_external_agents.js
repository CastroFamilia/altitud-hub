const OFFICE_IDS = {
  altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
  cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

const BASE_URL = 'https://api.remax-cca.com/api/AgentsPerOffice';

async function fetchExternalAgents() {
  try {
    let allAgents = [];

    // Altitud
    const r1 = await fetch(`${BASE_URL}/${OFFICE_IDS.altitud}`);
    if (r1.ok) {
      const data = await r1.json();
      allAgents.push(...data.map(a => ({ ...a, _officeName: 'Altitud' })));
    }

    // Altitud Cero
    const r2 = await fetch(`${BASE_URL}/${OFFICE_IDS.cero}`);
    if (r2.ok) {
      const data = await r2.json();
      allAgents.push(...data.map(a => ({ ...a, _officeName: 'Altitud Cero' })));
    }

    const agents = allAgents.map(a => ({
      AssociateID: a.AssociateID,
      Name: `${a.FirstName} ${a.LastName}`,
      RemaxEmail: a.RemaxEmail,
      NonRemaxEmail: a.NonRemaxEmail,
      Status: a.AssociateStatus_en,
      Office: a._officeName
    }));
    console.log("Agents retrieved from official RE/MAX CCA API (Both Offices):");
    console.table(agents);
  } catch (err) {
    console.error("Error fetching external agents:", err);
  }
}

fetchExternalAgents();
