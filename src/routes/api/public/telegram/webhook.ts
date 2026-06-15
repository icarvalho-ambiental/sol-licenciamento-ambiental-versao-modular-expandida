import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Telegram. Configure no BotFather/setWebhook:
 *   url=https://<host>/api/public/telegram/webhook
 *   secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
        const provided = request.headers.get("x-telegram-bot-api-secret-token");
        if (!secret || provided !== secret) {
          return new Response("forbidden", { status: 403 });
        }
        const body = (await request.json().catch(() => null)) as any;
        const chatId = body?.message?.chat?.id?.toString();
        const text = body?.message?.text as string | undefined;
        if (!chatId) return new Response("ok");
        // Skeleton: implementar /start (vincular usuário via código) e /status (listar requerimentos do tenant)
        if (text?.startsWith("/start")) {
          // TODO: enviar instruções de vínculo via Bot API
        }
        return new Response("ok");
      },
    },
  },
});