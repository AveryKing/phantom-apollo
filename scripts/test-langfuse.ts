
import dotenv from 'dotenv';
dotenv.config();
import { Langfuse } from 'langfuse';

async function test() {
    console.log("Testing Langfuse connection...");
    const langfuse = new Langfuse({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_HOST || "https://us.cloud.langfuse.com",
    });

    try {
        console.log("Fetching prompt: visionary-analysis-rubric-v1");
        const prompt = await langfuse.getPrompt('visionary-analysis-rubric-v1');
        console.log("✅ Prompt fetched successfully!");
        console.log("Prompt name:", prompt.name);
    } catch (error) {
        console.error("❌ Failed to fetch prompt:", error.message);
    } finally {
        await langfuse.flushAsync();
    }
}

test();
