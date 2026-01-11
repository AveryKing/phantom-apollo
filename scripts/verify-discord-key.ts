#!/usr/bin/env ts-node
/**
 * Quick script to verify DISCORD_PUBLIC_KEY is set correctly
 */

import dotenv from 'dotenv';

dotenv.config();

const publicKey = process.env.DISCORD_PUBLIC_KEY;

console.log('🔍 Checking Discord Public Key Configuration');
console.log('==========================================\n');

if (!publicKey) {
    console.error('❌ DISCORD_PUBLIC_KEY is not set in .env');
    console.log('\n📝 To fix:');
    console.log('1. Go to https://discord.com/developers/applications');
    console.log('2. Select your application');
    console.log('3. Go to General Information');
    console.log('4. Copy the Public Key value');
    console.log('5. Add to .env: DISCORD_PUBLIC_KEY=your_key_here');
    process.exit(1);
}

console.log('✅ DISCORD_PUBLIC_KEY is set');
console.log(`   Length: ${publicKey.length} characters`);
console.log(`   Format: ${/^[0-9a-f]{64}$/i.test(publicKey) ? 'Valid hex string (64 chars)' : '⚠️  Should be a 64-character hex string'}`);
console.log(`   Preview: ${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 8)}`);

if (publicKey === 'mock-key') {
    console.error('\n⚠️  WARNING: Using default mock-key. Update with your real Discord Public Key!');
    process.exit(1);
}

console.log('\n✅ Public Key looks good!');
console.log('💡 If verification still fails:');
console.log('   - Make sure the key matches exactly (no extra spaces/quotes)');
console.log('   - Restart the server after changing .env');
console.log('   - Verify the key in Discord Developer Portal matches this one');
