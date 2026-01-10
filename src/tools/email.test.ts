
import { sendDigestEmail } from './email';

async function testEmail() {
    console.log('🧪 Starting Email Tool Test...');
    try {
        const result = await sendDigestEmail(
            'Test Digest - Phantom Apollo',
            '<h1>Beast Mode Active</h1><p>The email system is successfully integrated.</p>'
        );
        console.log('✅ Test result:', result);
    } catch (e) {
        console.error('❌ Test failed:', e);
    }
}

if (require.main === module) {
    testEmail();
}
