import {
  mapReconnectToHub,
  extractReconnectImages,
  isWriteConfigured,
  fetchOfficeProperties
} from './reconnect-api';

describe('RECONNECT API Client', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('isWriteConfigured', () => {
    it('returns false when credentials are not configured', () => {
      expect(isWriteConfigured('altitud')).toBe(false);
      expect(isWriteConfigured('cero')).toBe(false);
    });
  });

  describe('mapReconnectToHub', () => {
    it('maps RECONNECT fields correctly to Hub fields', () => {
      const mockRaw = {
        ListingId: 'reconnect-123',
        ListingTitle_es: 'Propiedad de prueba',
        ListingTitle_en: 'Test Property',
        UnparsedAddress: 'Escazu, Costa Rica',
        ListPrice: 150000,
        CurrencyId: 2,
        BedroomsTotal: 3,
        BathroomsFull: 2,
        Photos: 'https://example.com/photo1.jpg|https://example.com/photo2.jpg',
      };

      const mapped = mapReconnectToHub(mockRaw);

      expect(mapped.reconnect_listing_id).toBe('reconnect-123');
      expect(mapped.name).toBe('Propiedad de prueba');
      expect(mapped.listing_title_es).toBe('Propiedad de prueba');
      expect(mapped.listing_title_en).toBe('Test Property');
      expect(mapped.unparsed_address).toBe('Escazu, Costa Rica');
      expect(mapped.list_price).toBe(150000);
      expect(mapped.list_price_currency_id).toBe(2);
      expect(mapped.bedrooms_total).toBe(3);
      expect(mapped.bathrooms_full).toBe(2);
      expect(mapped.status).toBe('published');
    });
  });

  describe('extractReconnectImages', () => {
    it('extracts images from a pipe-separated string', () => {
      const mockRaw = {
        Photos: 'https://example.com/1.jpg|https://example.com/2.jpg'
      };
      const images = extractReconnectImages(mockRaw);
      expect(images).toHaveLength(2);
      expect(images[0]).toEqual({
        image_url: 'https://example.com/1.jpg',
        thumbnail_url: null,
        priority: 0
      });
    });

    it('extracts images from an array of objects', () => {
      const mockRaw = {
        Photos: [
          { url: 'https://example.com/1.jpg', thumbnailUrl: 'https://example.com/1_t.jpg' }
        ]
      };
      const images = extractReconnectImages(mockRaw);
      expect(images).toHaveLength(1);
      expect(images[0]).toEqual({
        image_url: 'https://example.com/1.jpg',
        thumbnail_url: 'https://example.com/1_t.jpg',
        priority: 0
      });
    });
  });

  describe('fetchOfficeProperties', () => {
    it('returns error for unknown office key', async () => {
      const result = await fetchOfficeProperties('invalid-office');
      expect(result.properties).toEqual([]);
      expect(result.error).toContain('Unknown office key');
    });

    it('calls fetch with correct URL and returns properties', async () => {
      const mockProps = [{ id: '1', name: 'Prop 1' }];
      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProps)
        })
      );

      const result = await fetchOfficeProperties('altitud');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('FEA8746D-CC1D-41B8-89F3-D04AC98274AF'),
        expect.any(Object)
      );
      expect(result.properties).toEqual(mockProps);
      expect(result.error).toBeUndefined();
      fetchSpy.mockRestore();
    });

    it('returns error when fetch is not ok', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

      const result = await fetchOfficeProperties('altitud');
      expect(result.properties).toEqual([]);
      expect(result.error).toContain('Feed request failed: 500');
      fetchSpy.mockRestore();
    });
  });
});
