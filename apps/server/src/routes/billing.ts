import { Hono } from "hono";
import { prisma, PaymentStatus, PaymentMethod } from "@mogent/database";

export const billingRouter = new Hono();

// Plan Definitions
export const PLANS: Record<string, { name: string; price: number; pageLimit: number; msgLimit: number; features: string[] }> = {
  STARTER: {
    name: "Starter Plan",
    price: 999,
    pageLimit: 1,
    msgLimit: 5000,
    features: [
      "1 Facebook Page Connection",
      "Up to 5,000 AI Automated Messages/mo",
      "Gemini 2.0 Flash AI Model",
      "Standard RAG Knowledge Base",
      "Email & Community Support",
    ],
  },
  PRO: {
    name: "Pro Growth Plan",
    price: 2499,
    pageLimit: 5,
    msgLimit: 25000,
    features: [
      "Up to 5 Facebook Pages",
      "25,000 AI Automated Messages/mo",
      "Gemini 2.0 Flash + Key Rotator",
      "Human Handoff & Live Takeover",
      "WhatsApp & Hotline Sharing Protocol",
      "Telegram Escalation Alerts",
      "Priority 24/7 Support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise VIP Plan",
    price: 5999,
    pageLimit: 20,
    msgLimit: 100000,
    features: [
      "Unlimited / 20 Facebook Pages",
      "100,000+ AI Automated Messages/mo",
      "Custom System Personas & Fine-tuning",
      "Automated Order Confirmation & CRM",
      "Dedicated Account Manager",
      "Custom Webhook & API Integrations",
    ],
  },
};

// -----------------------------------------------------------------------------
// 1. GET WORKSPACE BILLING & SUBSCRIPTION STATUS
// -----------------------------------------------------------------------------
billingRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let workspace: any = null;
    if (workspaceId) {
      workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          paymentTransactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          facebookPages: { select: { id: true } },
        },
      });
    }

    if (!workspace) {
      const defaultWs = await prisma.workspace.findFirst({
        include: {
          paymentTransactions: { orderBy: { createdAt: "desc" }, take: 10 },
          facebookPages: { select: { id: true } },
        },
      });
      workspace = defaultWs;
    }

    const currentPlanKey = (workspace?.plan || "STARTER").toUpperCase();
    const currentPlanInfo = PLANS[currentPlanKey] || PLANS.STARTER;

    // Check if there is any pending payment verification
    const pendingPayment = workspace?.paymentTransactions?.find(
      (tx: any) => tx.status === PaymentStatus.PENDING
    );

    return c.json({
      success: true,
      data: {
        workspaceId: workspace?.id,
        workspaceName: workspace?.name,
        currentPlan: currentPlanKey,
        currentPlanDetails: currentPlanInfo,
        planExpiresAt: workspace?.planExpiresAt,
        connectedPagesCount: workspace?.facebookPages?.length || 0,
        pageLimit: currentPlanInfo.pageLimit,
        pendingPayment: pendingPayment || null,
        paymentHistory: workspace?.paymentTransactions || [],
        paymentAccounts: {
          bKashMerchant: "01819234567 (Merchant / Make Payment)",
          bKashPersonal: "01711998877 (Send Money)",
          nagadPersonal: "01711998877 (Send Money)",
          rocketPersonal: "01711998877-0 (Send Money)",
          bankAccount: "City Bank, Account: 1234567890, Branch: Dhanmondi",
        },
      },
    });
  } catch (error: any) {
    console.error("Billing fetch error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. SUBMIT PAYMENT TRANSACTION (bKash, Nagad, Rocket)
// -----------------------------------------------------------------------------
billingRouter.post("/submit-payment", async (c) => {
  try {
    const body = await c.req.json();
    const { plan, method, senderNumber, trxId, notes } = body;
    let workspaceId = c.req.header("x-workspace-id") || body.workspaceId;

    if (!plan || !senderNumber || !trxId) {
      return c.json({ success: false, error: "Plan, Sender Number, and TrxID are required" }, 400);
    }

    if (!workspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      workspaceId = defaultWs?.id;
    }

    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace not found" }, 404);
    }

    const cleanPlan = plan.toUpperCase();
    const planInfo = PLANS[cleanPlan] || PLANS.STARTER;

    // Normalize Payment Method
    let paymentMethod: PaymentMethod = PaymentMethod.BKASH;
    if (method === "NAGAD") paymentMethod = PaymentMethod.NAGAD;
    if (method === "ROCKET") paymentMethod = PaymentMethod.ROCKET;
    if (method === "BANK_TRANSFER") paymentMethod = PaymentMethod.BANK_TRANSFER;

    // Check if TrxID was already submitted
    const existingTx = await prisma.paymentTransaction.findUnique({
      where: { trxId: trxId.trim() },
    });

    if (existingTx) {
      return c.json({ success: false, error: "This Transaction ID has already been submitted." }, 409);
    }

    const tx = await prisma.paymentTransaction.create({
      data: {
        workspaceId,
        plan: cleanPlan,
        amount: planInfo.price,
        currency: "BDT",
        method: paymentMethod,
        senderNumber: senderNumber.trim(),
        trxId: trxId.trim().toUpperCase(),
        notes: notes?.trim() || undefined,
        status: PaymentStatus.PENDING,
      },
    });

    return c.json({
      success: true,
      data: tx,
      message: "Payment submitted successfully. Admin will verify and activate your plan within 15-30 minutes.",
    });
  } catch (error: any) {
    console.error("Payment submission error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. ADMIN: GET ALL PAYMENT REQUESTS
// -----------------------------------------------------------------------------
billingRouter.get("/admin/payments", async (c) => {
  try {
    const transactions = await prisma.paymentTransaction.findMany({
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            members: {
              include: { user: { select: { email: true, name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = transactions.map((tx) => ({
      id: tx.id,
      workspaceId: tx.workspaceId,
      workspaceName: tx.workspace.name,
      ownerEmail: tx.workspace.members[0]?.user.email || "Unknown",
      ownerName: tx.workspace.members[0]?.user.name || "Unknown",
      plan: tx.plan,
      amount: tx.amount,
      currency: tx.currency,
      method: tx.method,
      senderNumber: tx.senderNumber,
      trxId: tx.trxId,
      status: tx.status,
      notes: tx.notes,
      adminNote: tx.adminNote,
      createdAt: tx.createdAt,
      approvedAt: tx.approvedAt,
    }));

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("Admin payments fetch error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. ADMIN: APPROVE PAYMENT & ACTIVATE SUBSCRIPTION
// -----------------------------------------------------------------------------
billingRouter.post("/admin/payments/:id/approve", async (c) => {
  const { id } = c.req.param();
  try {
    const tx = await prisma.paymentTransaction.findUnique({
      where: { id },
    });

    if (!tx) {
      return c.json({ success: false, error: "Transaction not found" }, 404);
    }

    // Set expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [updatedTx, updatedWs] = await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id },
        data: {
          status: PaymentStatus.APPROVED,
          approvedAt: new Date(),
        },
      }),
      prisma.workspace.update({
        where: { id: tx.workspaceId },
        data: {
          plan: tx.plan,
          planExpiresAt: expiresAt,
        },
      }),
    ]);

    return c.json({
      success: true,
      message: `Plan [${tx.plan}] activated for Workspace [${updatedWs.name}] until ${expiresAt.toLocaleDateString()}`,
      data: { transaction: updatedTx, workspace: updatedWs },
    });
  } catch (error: any) {
    console.error("Payment approve error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 5. ADMIN: REJECT PAYMENT
// -----------------------------------------------------------------------------
billingRouter.post("/admin/payments/:id/reject", async (c) => {
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const { reason } = body;

    const updated = await prisma.paymentTransaction.update({
      where: { id },
      data: {
        status: PaymentStatus.REJECTED,
        adminNote: reason || "Invalid transaction ID or payment not received",
      },
    });

    return c.json({ success: true, data: updated, message: "Payment transaction rejected." });
  } catch (error: any) {
    console.error("Payment reject error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
