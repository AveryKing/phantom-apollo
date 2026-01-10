
import puppeteer from 'puppeteer';

/**
 * Capture a screenshot of a website.
 * Returns the base64 encoded image string.
 */
export async function takeScreenshot(url: string): Promise<string> {
    console.log(`📸 [Browser] Navigating to ${url}...`);

    // Launch browser
    // Note: For Cloud Run later, we will need specific args ('--no-sandbox', etc.)
    // For local dev, defaults are usually fine.
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Set viewport to a standard desktop size
        await page.setViewport({ width: 1280, height: 720 });

        // Navigate with a timeout
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log(`📸 [Browser] Capturing screenshot...`);

        // Capture screenshot as base64 string
        const screenshotBuffer = await page.screenshot({
            encoding: 'base64',
            type: 'jpeg', // JPEG is smaller/faster for LLMs than PNG
            quality: 80
        });

        return screenshotBuffer as string;

    } catch (error) {
        console.error(`❌ [Browser] Failed to screenshot ${url}:`, error);
        throw error;
    } finally {
        await browser.close();
    }
}
