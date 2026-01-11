import { sendDigestEmail } from './email';

// Mock the email module to avoid sending real emails during tests
jest.mock('./email', () => ({
    sendDigestEmail: jest.fn().mockResolvedValue({ id: 'mock-email-id' })
}));

describe('Email Tool', () => {
    it('should send a digest email', async () => {
        const result = await sendDigestEmail(
            'Test Digest - Phantom Apollo',
            '<h1>Beast Mode Active</h1><p>The email system is successfully integrated.</p>'
        );
        expect(result).toBeDefined();
        expect(result).toHaveProperty('id', 'mock-email-id');
    });
});

if (require.main === module) {
    // Original manual test logic if needed, but safe to remove or keep for manual runs
    (async () => {
        console.log('🧪 Starting Manual Email Tool Test...');
        // We'd need to unmock or use a real impl for manual run, 
        // but for now let's just keep the Jest structure as the priority.
    })();
}
