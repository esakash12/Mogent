import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import { prisma } from "@mogent/database";
import { SendTelegramAlertPayload } from "@mogent/shared";
import { telegramApi } from "../services/telegram-api";

export function startTelegramWorker() {
  const worker = new Worker<SendTelegramAlertPayload>(
    "telegram-alerts",
    async (job: Job<SendTelegramAlertPayload>) => {
      const payload = job.data;
      console.log(`📣 Sending Telegram Alert for Workspace [${payload.workspaceId}]...`);

      // 1. Fetch Telegram Config for Workspace
      const config = await prisma.telegramConfig.findFirst({
        where: {
          workspaceId: payload.workspaceId,
          isActive: true,
        },
      });

      if (!config) {
        console.warn(`⚠️ No active TelegramConfig found for Workspace [${payload.workspaceId}]. Alert not sent.`);
        return;
      }

      // 2. Dispatch via Telegram Bot API
      const success = await telegramApi.sendEscalationAlert(
        config.botToken,
        config.chatId,
        payload
      );

      // 3. Mark Escalation Event in DB
      if (success) {
        await prisma.escalationEvent.updateMany({
          where: {
            conversationId: payload.conversationId,
            status: "PENDING",
          },
          data: {
            telegramSent: true,
            status: "NOTIFIED",
          },
        });
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Telegram Alert Job [${job.id}] completed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Telegram Alert Job [${job?.id}] failed:`, err.message);
  });

  return worker;
}
