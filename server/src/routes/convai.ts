// ConvAI routes - signed URL proxy for ElevenLabs Conversational AI
import { Router, Request } from 'express';
import { config } from '../config';

const router = Router();

/**
 * GET /api/convai/signed-url?agentId=xxx
 * Generate a signed URL for an ElevenLabs Conversational AI session
 * Accepts agentId as query param, falls back to default from env
 */
router.get('/signed-url', async (req: Request, res, next) => {
    try {
        const apiKey = config.ELEVENLABS_API_KEY;
        const agentId = (req.query.agentId as string) || config.ELEVENLABS_AGENT_ID;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'ElevenLabs API key not configured',
            });
        }

        if (!agentId) {
            return res.status(400).json({
                success: false,
                error: 'No agent ID provided. Pass ?agentId=xxx or set ELEVENLABS_AGENT_ID in .env',
            });
        }

        console.log(`[ConvAI] Requesting signed URL for agent: ${agentId}`);

        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
            {
                headers: {
                    'xi-api-key': apiKey,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ConvAI] Failed to get signed URL:', errorText);
            return res.status(response.status).json({
                success: false,
                error: 'Failed to get signed URL from ElevenLabs',
            });
        }

        const body = (await response.json()) as { signed_url: string };
        console.log(`[ConvAI] Signed URL obtained for agent: ${agentId}`);

        res.json({
            success: true,
            signedUrl: body.signed_url,
        });
    } catch (error) {
        console.error('[ConvAI] Error:', error);
        next(error);
    }
});

export default router;
