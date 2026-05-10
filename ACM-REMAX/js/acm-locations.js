// ==========================================
// ACM LOCATIONS — Pérez Zeledón + Osa (Dominical)
// Hierarchical: Cantón → Distrito → Poblado/Barrio
// ==========================================

const ACM_LOCATIONS = {
    "Pérez Zeledón": {
        "San Isidro de El General": [
            "Aeropuerto", "Alto Alonso", "Boruca", "Boston", "Cementerio", "Cooperativa", "Cristo Rey", "Doce de Marzo", "Dorotea", "Durán Picado", "España", "Estadio", "Evans Gordon Wilson", "González", "Hospital", "Hoyón", "I Griega", "La Lucha", "Las Américas", "Lomas de Cocorí", "Luis Monge", "Morazán", "Pavones", "Pedregoso", "Pocito", "Prado", "Romero", "Sagrada Familia", "San Andrés", "San Luis", "San Rafael Sur", "San Vicente", "Santa Cecilia", "Sinaí", "Tierra Prometida", "Tormenta", "Unesco", "Valverde",
            "Alto Ceibo", "Alto Huacas", "Alto Sajaral", "Alto San Juan", "Alto Tumbas", "Angostura", "Bajo Ceibo", "Bajo Esperanzas", "Bajo Mora", "Bijaguales", "Bocana", "Bonita", "Ceibo", "Ceniza", "Dorado", "Esperanzas", "Guadalupe", "Guaria", "Higuerones", "Jilguero", "Jilguero Sur", "Los Guayabos", "María Auxiliadora", "Miravalles", "Morete", "Ojo de Agua", "Ocho de Diciembre", "Pacuarito", "Palma", "Paso Beita", "Paso Lagarto", "Quebrada Honda", "Quebrada Vueltas", "Quebradas", "Roble", "Rosario", "San Agustín", "San Jorge", "San Juan de Miramar", "San Lorenzo", "San Rafael Norte", "Santa Fe", "Santa Marta", "Suiza", "Tajo", "Toledo", "Tronconales", "Tuis", "Villanueva"
        ],
        "El General": [
            "General Viejo", "Venecia", "Nuevo General", "Peñas Blancas", "El Ingenio", "Calle Hidalgo", "San Martín", "Pinar del Río", "Santa Elena", "Trinidad", "Las Nubes", "La Paz", "Barrio Nuevo", "Bajo Los Arias", "El Chumpulún", "Calle Guzmán", "Playa Verde", "La Linda", "El Carril", "Paraíso", "San Luis", "Miraflores", "Santa Cruz", "San Blas", "La Hermosa", "La Arepa", "Quizarrá", "Montecarlo", "Arepa", "Carmen", "Chanchos", "Hermosa", "Linda Arriba"
        ],
        "Daniel Flores": [
            "Palmares", "Alto Brisas", "Los Ángeles", "Aurora", "Los Chiles", "Crematorio", "Daniel Flores Zavaleta", "Barrio Laboratorio", "Los Pinos", "Loma Verde", "Lourdes", "Rosas", "Rosa Iris", "San Francisco", "Santa Margarita", "La Trocha", "Villa Ligia", "Aguas Buenas", "Bajos de Pacuar", "Concepción", "Corazón de Jesús", "Juntas de Pacuar", "Paso Bote", "Patio de Agua", "Peje", "Percal", "Repunta", "Los Reyes", "La Ribera", "La Suiza"
        ],
        "Rivas": [
            "San Gerardo", "Canaán", "Chimirol", "Herradura", "Los Ángeles", "Guadalupe", "San Francisco", "Talari", "San José", "Monterrey", "Calle Los Mora", "Zapotal", "Chispa", "Chuma", "Río Blanco", "Buena Vista", "La Piedra", "Palmital", "San Juan Norte", "Alaska", "Piedra Alta", "Alto Jaular", "San Cayetano", "Las Playas", "Rivas", "Pueblo Nuevo", "Miravalles", "La Bonita", "Linda Vista", "Tirrá", "La Bambú", "San Antonio", "Lourdes", "Santa Marta", "División", "El Jardín", "Villa Mills", "Macho Mora", "El Nivel-Siberia"
        ],
        "San Pedro": [
            "Cruz Roja", "San Pedro", "Arenilla", "Alto Calderón", "Cedral", "Colonia", "Cristo Rey", "Esperanza", "Fátima", "Fortuna", "Guaria", "Los Ángeles", "Laguna", "Nueva Hortensia", "Nueva Santa Ana", "Rinconada Vega", "San Jerónimo", "San Juan", "San Juancito", "San Rafael", "Santa Ana", "Santa Cecilia", "Santo Domingo", "Santiago", "Tambor", "Unión", "Zapotal"
        ],
        "Platanares": [
            "San Rafael", "Bajo Bonitas", "Bajo Espinoza", "Bolivia", "Bonitas", "Buenos Aires", "Cristo Rey", "La Sierra", "Lourdes", "Mastatal", "Mollejoncito", "Mollejones", "Naranjos", "San Pablito", "San Pablo", "Socorro", "Surtubal", "Villa Argentina", "Villa Flor", "Vista de Mar", "San Gerardo"
        ],
        "Pejibaye": [
            "Achiotal", "Águila", "Alto Trinidad", "Bajo Caliente", "Bajo Minas", "Barrionuevo", "Bellavista", "Calientillo", "Delicias", "Desamparados", "El Progreso", "Gibre", "Guadalupe", "Las Cruces", "Mesas", "Minas", "Paraíso", "San Marcos", "San Martín", "San Miguel", "Santa Fe", "Trinidad", "Veracruz", "Zapote"
        ],
        "Cajón": [
            "Cedral", "El Quemado", "Gloria", "Las Brisas", "Los Vega", "Mercedes", "Montecarlo", "Navajuelar", "Nubes", "Paraíso", "Pilar", "Pueblo Nuevo", "Quizarrá", "Salitrales", "San Francisco", "San Ignacio", "San Pedrito", "Santa María", "Santa Teresa"
        ],
        "Barú": [
            "Alfombra", "Alto Perla", "Bajos", "Bajos de Zapotal", "Barú", "Barucito", "Cacao", "Camarones", "Cañablanca", "Ceiba", "Chontales", "Farallas", "Florida", "San Juan de Dios", "Líbano", "Magnolia", "Pozos", "Reina", "San Marcos", "San Salvador", "Santa Juana", "Santo Cristo", "Tinamaste", "Torito", "Tres Piedras", "Tumbas", "Villabonita Vista Mar"
        ],
        "Río Nuevo": [
            "Santa Rosa", "San Antonio", "Calle Mora", "San Juan de la Cruz", "Santa Marta", "La Purruja", "San Cayetano", "Chirricano", "Savegre", "El Llano", "El Brujo", "Piedras Blancas", "Zaragoza", "Santa Lucía", "California"
        ],
        "Páramo": [
            "San Ramón Sur", "Alto Macho Mora", "Siberia", "División", "Miramar", "Jardín", "La Hortensia", "La Ese", "Matazanos", "Valencia", "San Ramón Norte", "Berlín", "Ángeles", "Santo Tomás", "Santa Eduviges", "San Miguel", "Pedregosito"
        ],
        "La Amistad": [
            "San Antonio", "Corralillo", "China Kicha", "Montezuma", "Oratorio", "San Carlos", "San Gabriel", "San Roque", "Santa Cecilia", "Santa Luisa"
        ]
    },
    "Osa (Dominical–Uvita)": {
        "Puerto Cortés": [
            "Ciudad Cortés", "Balsar", "Canasta", "Garabito", "Ojo de Agua", "Puente de Tierra", "Tortuga Arriba",
            "Chontales"
        ],
        "Palmar": [
            "Palmar Norte", "Palmar Sur", "Almirante", "Sierpe Vieja", "Vergel", "Barrio Los Pinos", "Barrio Cooperativa"
        ],
        "Sierpe": [
            "Sierpe Centro", "Ajuntaderas", "Boca Ganado", "Isla Violín", "San Josecito", "Estero Azul"
        ],
        "Bahía Ballena": [
            "Uvita", "Dominical", "Dominicalito", "Escaleras", "Playa Hermosa", "Ballena", "San Josecito", "San Martín", "Lagunas",
            "Canto del Mar", "Mar y Selva", "Villas Gaia", "Tucán Valley", "Ventana de Sayulita", "Selva Armonía", "Casas de la Selva", "Las Olas", "Solemar", "Condominio Kalia"
        ],
        "Piedras Blancas": [
            "Piedras Blancas", "Chacarita", "Kilómetro 24", "Mogos", "Rincón"
        ],
        "Bahía Drake": [
            "Agujas", "Boca del Río Drake", "Los Planes", "Progreso", "Rancho Quemado"
        ]
    },
    "Quepos": {
        "Quepos": [
            "Quepos Centro", "Boca Vieja", "Cerros", "La Managua"
        ],
        "Savegre": [
            "Hacienda Barú", "Guápil", "Santo Domingo", "San Francisco", "El Brujo", "Savegre Arriba", "Savegre Abajo", "Ángeles", "Silencio"
        ],
        "Naranjito": [
            "Naranjito Centro", "Londres", "Villanueva", "Alto Naranjito"
        ],
        "Manuel Antonio": [
            "Manuel Antonio", "Paso Real"
        ]
    }
};

// ==========================================
// FLAT INDEX for autocomplete search
// ==========================================
let _acmFlatIndex = null;

function getACMFlatIndex() {
    if (_acmFlatIndex) return _acmFlatIndex;
    _acmFlatIndex = [];
    for (const [canton, districts] of Object.entries(ACM_LOCATIONS)) {
        for (const [district, barrios] of Object.entries(districts)) {
            for (const barrio of barrios) {
                _acmFlatIndex.push({
                    canton, district, barrio,
                    searchStr: `${barrio} ${district} ${canton}`.toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    display: `${barrio}, ${district}, ${canton}`
                });
            }
        }
    }
    return _acmFlatIndex;
}

// Search across all locations — returns top N matches
function searchACMLocations(query, limit = 12) {
    if (!query || query.length < 2) return [];
    const norm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terms = norm.split(/\s+/);
    const index = getACMFlatIndex();
    
    const scored = [];
    for (const item of index) {
        let match = true;
        let score = 0;
        for (const term of terms) {
            if (!item.searchStr.includes(term)) { match = false; break; }
            // Boost exact start matches
            if (item.searchStr.startsWith(term)) score += 10;
            else score += 1;
        }
        if (match) scored.push({ ...item, score });
    }
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
}

// Helper: Get all cantons
function getACMCantons() {
    return Object.keys(ACM_LOCATIONS);
}

// Helper: Get districts for a canton
function getACMDistricts(canton) {
    return ACM_LOCATIONS[canton] ? Object.keys(ACM_LOCATIONS[canton]) : [];
}

// Helper: Get barrios for a district within a canton
function getACMBarrios(canton, district) {
    return ACM_LOCATIONS[canton]?.[district] || [];
}

// ==========================================
// DISTRICT COORDINATES for map zoom
// Key: "district|canton" → [lat, lng, zoom]
// ==========================================
const ACM_DISTRICT_COORDS = {
    // Pérez Zeledón
    "San Isidro de El General|Pérez Zeledón": [9.3787, -83.7008, 14],
    "El General|Pérez Zeledón": [9.3550, -83.6550, 14],
    "Daniel Flores|Pérez Zeledón": [9.3450, -83.6800, 14],
    "Rivas|Pérez Zeledón": [9.4650, -83.6850, 13],
    "San Pedro|Pérez Zeledón": [9.3150, -83.6300, 13],
    "Platanares|Pérez Zeledón": [9.3100, -83.7200, 13],
    "Pejibaye|Pérez Zeledón": [9.2800, -83.5900, 13],
    "Cajón|Pérez Zeledón": [9.2200, -83.6100, 13],
    "Barú|Pérez Zeledón": [9.2900, -83.8100, 13],
    "Río Nuevo|Pérez Zeledón": [9.3050, -83.7700, 13],
    "Páramo|Pérez Zeledón": [9.5100, -83.7200, 13],
    "La Amistad|Pérez Zeledón": [9.3100, -83.5200, 12],
    
    // Osa
    "Puerto Cortés|Osa (Dominical–Uvita)": [8.9600, -83.5300, 13],
    "Palmar|Osa (Dominical–Uvita)": [8.9500, -83.4700, 13],
    "Sierpe|Osa (Dominical–Uvita)": [8.8700, -83.4800, 13],
    "Bahía Ballena|Osa (Dominical–Uvita)": [9.1550, -83.7450, 14],
    "Piedras Blancas|Osa (Dominical–Uvita)": [8.7800, -83.3500, 13],
    "Bahía Drake|Osa (Dominical–Uvita)": [8.7000, -83.5500, 13],
    
    // Quepos
    "Quepos|Quepos": [9.4310, -84.1620, 14],
    "Savegre|Quepos": [9.3200, -83.9100, 13],
    "Naranjito|Quepos": [9.4100, -84.0700, 13],
    "Manuel Antonio|Quepos": [9.3920, -84.1400, 14],
};

// Specific barrio overrides (for well-known places)
const ACM_BARRIO_COORDS = {
    "Dominical": [9.2500, -83.8570, 15],
    "Uvita": [9.1640, -83.7530, 15],
    "Dominicalito": [9.2350, -83.8480, 15],
    "Escaleras": [9.2300, -83.8350, 15],
    "Playa Hermosa": [9.2060, -83.8200, 15],
    "Ballena": [9.1470, -83.7320, 15],
    "Lagunas": [9.1650, -83.7100, 14],
    "San Gerardo": [9.4560, -83.5860, 14],
    "Tinamaste": [9.2780, -83.8060, 14],
    "Manuel Antonio": [9.3920, -84.1400, 15],
    "Hacienda Barú": [9.2800, -83.8700, 15],
    "Quepos Centro": [9.4310, -84.1620, 15],
    "Ciudad Cortés": [8.9600, -83.5300, 14],
    "Palmar Norte": [8.9650, -83.4700, 14],
    "Palmar Sur": [8.9400, -83.4600, 14],
    "Sierpe Centro": [8.8700, -83.4800, 14],
    "General Viejo": [9.3450, -83.6400, 15],
    "Canto del Mar": [9.2380, -83.8500, 15],
    "Mar y Selva": [9.2200, -83.8400, 15],
};

// Get coordinates for a location selection
function getLocationCoords(canton, district, barrio) {
    // Try specific barrio first
    if (barrio && ACM_BARRIO_COORDS[barrio]) {
        return ACM_BARRIO_COORDS[barrio];
    }
    // Then district
    const key = `${district}|${canton}`;
    if (ACM_DISTRICT_COORDS[key]) {
        return ACM_DISTRICT_COORDS[key];
    }
    // Default fallback
    return null;
}
