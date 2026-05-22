import {
  ACM_LOCATIONS,
  getACMFlatIndex,
  searchACMLocations,
  getACMCantons,
  getACMDistricts,
  getACMBarrios,
  getLocationCoords,
  ACM_DISTRICT_COORDS,
  ACM_BARRIO_COORDS,
} from './locations';

describe('locations.js — ACM Location Utilities', () => {

  // ─── Data integrity ───
  describe('ACM_LOCATIONS data', () => {
    it('contains the three main cantons', () => {
      expect(Object.keys(ACM_LOCATIONS)).toEqual(
        expect.arrayContaining(['Pérez Zeledón', 'Osa (Dominical–Uvita)', 'Quepos'])
      );
    });

    it('Pérez Zeledón has districts', () => {
      const districts = Object.keys(ACM_LOCATIONS['Pérez Zeledón']);
      expect(districts.length).toBeGreaterThanOrEqual(10);
      expect(districts).toContain('San Isidro de El General');
      expect(districts).toContain('Daniel Flores');
    });

    it('each district has at least one barrio', () => {
      for (const [canton, districts] of Object.entries(ACM_LOCATIONS)) {
        for (const [district, barrios] of Object.entries(districts)) {
          expect(barrios.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ─── getACMCantons ───
  describe('getACMCantons()', () => {
    it('returns an array of canton names', () => {
      const cantons = getACMCantons();
      expect(Array.isArray(cantons)).toBe(true);
      expect(cantons).toContain('Pérez Zeledón');
      expect(cantons).toContain('Quepos');
    });
  });

  // ─── getACMDistricts ───
  describe('getACMDistricts()', () => {
    it('returns districts for Pérez Zeledón', () => {
      const districts = getACMDistricts('Pérez Zeledón');
      expect(districts).toContain('Rivas');
      expect(districts).toContain('Barú');
    });

    it('returns empty array for unknown canton', () => {
      expect(getACMDistricts('Narnia')).toEqual([]);
    });
  });

  // ─── getACMBarrios ───
  describe('getACMBarrios()', () => {
    it('returns barrios for a valid canton+district', () => {
      const barrios = getACMBarrios('Quepos', 'Manuel Antonio');
      expect(barrios).toContain('Manuel Antonio');
    });

    it('returns empty array for unknown district', () => {
      expect(getACMBarrios('Quepos', 'Fake District')).toEqual([]);
    });

    it('returns empty array for unknown canton', () => {
      expect(getACMBarrios('Fake', 'Fake')).toEqual([]);
    });
  });

  // ─── getACMFlatIndex ───
  describe('getACMFlatIndex()', () => {
    it('returns a flat array of all locations', () => {
      const index = getACMFlatIndex();
      expect(Array.isArray(index)).toBe(true);
      expect(index.length).toBeGreaterThan(100); // lots of barrios
    });

    it('each entry has canton, district, barrio, searchStr, display', () => {
      const index = getACMFlatIndex();
      const entry = index[0];
      expect(entry).toHaveProperty('canton');
      expect(entry).toHaveProperty('district');
      expect(entry).toHaveProperty('barrio');
      expect(entry).toHaveProperty('searchStr');
      expect(entry).toHaveProperty('display');
    });

    it('caches the result (returns same reference on second call)', () => {
      const a = getACMFlatIndex();
      const b = getACMFlatIndex();
      expect(a).toBe(b);
    });
  });

  // ─── searchACMLocations ───
  describe('searchACMLocations()', () => {
    it('returns empty array for empty query', () => {
      expect(searchACMLocations('')).toEqual([]);
    });

    it('returns empty array for single-char query', () => {
      expect(searchACMLocations('a')).toEqual([]);
    });

    it('finds Dominical', () => {
      const results = searchACMLocations('Dominical');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].barrio).toBe('Dominical');
    });

    it('finds locations with accented characters', () => {
      const results = searchACMLocations('Perez');
      expect(results.length).toBeGreaterThan(0);
    });

    it('respects the limit parameter', () => {
      const results = searchACMLocations('San', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('scores exact-start matches higher', () => {
      const results = searchACMLocations('Uvita');
      expect(results[0].barrio).toBe('Uvita');
    });
  });

  // ─── getLocationCoords ───
  describe('getLocationCoords()', () => {
    it('returns barrio coords when available', () => {
      const coords = getLocationCoords('Osa (Dominical–Uvita)', 'Bahía Ballena', 'Dominical');
      expect(coords).toEqual([9.2500, -83.8570, 15]);
    });

    it('falls back to district coords when barrio not found', () => {
      const coords = getLocationCoords('Quepos', 'Manuel Antonio', 'UnknownBarrio');
      expect(coords).toEqual(ACM_DISTRICT_COORDS['Manuel Antonio|Quepos']);
    });

    it('returns null when nothing matches', () => {
      const coords = getLocationCoords('Fake', 'Fake', 'Fake');
      expect(coords).toBeNull();
    });
  });
});
