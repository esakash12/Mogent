import { Queue } from "bullmq";
import { redisConnection } from "../redis";
import { ProcessMessageJobPayload, SendTelegramAlertPayload } from "@mogent/shared";

// 1. Ingestion Queue for Facebook Messenger Webhook messages
export const incomingMessagesQueue = new Queue<ProcessMessageJobPayload>("incoming-messages", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s -> 4s -> 8s
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours for diagnosis
      count: 5000,
    },
  },
});

// 2. Queue for Crucial Moment & Escalation Alerts to Telegram
export const telegramAlertsQueue = new Queue<SendTelegramAlertPayload>("telegram-alerts", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 500,
    removeOnFail: 2000,
  },
});
