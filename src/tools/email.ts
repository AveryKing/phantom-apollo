
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const humanEmail = process.env.HUMAN_EMAIL || 'avery@example.com';

if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY not found in .env. Email dispatch will be mocked.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends a personalized daily digest of agent findings and message drafts.
 */
export async function sendDigestEmail(subject: string, htmlContent: string) {
    if (!resend) {
        console.log(`[Mock Email] To: ${humanEmail}\nSubject: ${subject}\nContent: (HTML clipped)`);
        return { success: true, message: 'Mock email logged' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Phantom Apollo <onboarding@resend.dev>',
            to: humanEmail,
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error('❌ Resend API Error:', error);
            throw error;
        }

        console.log(`📧 Digest email sent successfully: ${data?.id}`);
        return { success: true, id: data?.id };

    } catch (e) {
        console.error('❌ Failed to dispatch email:', e);
        throw e;
    }
}
