
import dotenv from 'dotenv';
dotenv.config();

import { webSearch } from '../src/tools/web-search';

async function test() {
    console.log("🧪 Testing webSearch Tool...");
    try {
        const result = await webSearch("LangChain vs LangGraph");
        console.log("✅ Success!");
        console.log(result.substring(0, 100) + "...");
    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}

test();
