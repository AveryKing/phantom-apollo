
import 'dotenv/config';

// Simple fetch implementation to register commands
async function registerCommands() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const appId = process.env.DISCORD_APPLICATION_ID; // We need to add this to .env

    if (!token) {
        throw new Error("Missing DISCORD_BOT_TOKEN");
    }

    // If APP_ID is missing, try to parse it from the token (Tokens often start with Base64 encoded ID)
    let applicationId = appId;
    if (!applicationId) {
        console.warn("DISCORD_APPLICATION_ID not found in .env. Attempting to extract from Token...");
        try {
            const idPart = token.split('.')[0];
            applicationId = Buffer.from(idPart, 'base64').toString('utf-8');
            console.log(`Extracted Application ID: ${applicationId}`);
        } catch (e) {
            throw new Error("Could not extract App ID. Please add DISCORD_APPLICATION_ID to .env");
        }
    }

    const commands = [
        {
            name: 'hunt',
            description: 'Start the daily business development hunt',
            type: 1, // CHAT_INPUT
            options: [
                {
                    name: 'niche',
                    description: 'Specific business niche to hunt (e.g. AI Video Editors)',
                    type: 3, // STRING
                    required: false
                }
            ]
        },
        {
            name: 'ping',
            description: 'Health check to verify bot is alive',
            type: 1
        }
    ];

    console.log(`🚀 Registering ${commands.length} commands for App ID: ${applicationId}...`);

    const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bot ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
    });

    if (response.ok) {
        console.log('✅ Success! Slash commands registered.');
        console.log('👉 Go to Discord and try typing /hunt');
    } else {
        const errorText = await response.text();
        console.error('❌ Failed to register commands:', response.status, errorText);
    }
}

registerCommands();
