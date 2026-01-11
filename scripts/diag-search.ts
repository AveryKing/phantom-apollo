
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const key = process.env.GOOGLE_SEARCH_API_KEY || "";
    const cx = process.env.GOOGLE_CX || "";

    console.log(`Key: ${key.substring(0, 5)}...${key.substring(key.length - 3)} (Len: ${key.length})`);
    console.log(`CX: ${cx.substring(0, 5)}...${cx.substring(cx.length - 3)} (Len: ${cx.length})`);

    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=test`;
    const res = await fetch(url);
    const data = await res.json() as any;
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
}

test();
