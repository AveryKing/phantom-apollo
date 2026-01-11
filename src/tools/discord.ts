
/**
 * Discord Tooling
 * Allows the agent to send follow-up messages to a slash command interaction.
 */

export async function sendDiscordFollowup(token: string, content: string, embeds?: any[]) {
    const appId = process.env.DISCORD_APPLICATION_ID || extractAppIdFromToken(process.env.DISCORD_BOT_TOKEN || "");

    if (!appId || !token) {
        console.warn("⚠️ Cannot send Discord followup: Missing App ID or Interaction Token");
        return;
    }

    const url = `https://discord.com/api/v10/webhooks/${appId}/${token}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                embeds: embeds
            })
        });

        if (!response.ok) {
            console.error(`❌ Discord Followup Failed: ${response.status} ${await response.text()}`);
        }
    } catch (error) {
        console.error("❌ Link failure sending Discord followup:", error);
    }
}

function extractAppIdFromToken(token: string): string {
    try {
        const idPart = token.split('.')[0];
        return Buffer.from(idPart, 'base64').toString('utf-8');
    } catch (e) {
        return "";
    }
}
