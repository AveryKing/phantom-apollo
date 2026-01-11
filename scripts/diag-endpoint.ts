
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const key = process.env.GOOGLE_SEARCH_API_KEY || "";
    const cx = process.env.GOOGLE_CX || "";

    const url = `https://customsearch.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=test`;
    const res = await fetch(url);
    const data = await res.json() as any;
    console.log("URL:", url.replace(key, 'REDACTED'));
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
}

test();
