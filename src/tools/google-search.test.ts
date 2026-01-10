import { googleSearch } from './google-search';

describe('googleSearch Tool', () => {
    it('should throw an error if API keys are missing', async () => {
        // Save original env
        const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
        const originalID = process.env.GOOGLE_SEARCH_ENGINE_ID;

        delete process.env.GOOGLE_SEARCH_API_KEY;
        delete process.env.GOOGLE_SEARCH_ENGINE_ID;

        await expect(googleSearch('test')).rejects.toThrow('Missing Google Search Configuration');

        // Restore original env
        process.env.GOOGLE_SEARCH_API_KEY = originalKey;
        process.env.GOOGLE_SEARCH_ENGINE_ID = originalID;
    });

    it('should handle empty queries gracefully', async () => {
        const results = await googleSearch('');
        expect(results).toEqual([]);
    });
});
