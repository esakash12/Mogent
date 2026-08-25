import { Hono } from "hono";
import { verify } from "hono/jwt";
import { prisma, PaymentStatus, PaymentMethod } from "@mogent/database";
import { redisConnection } from "../redis";
import { config } from "../config";
import { isValidBdPhone, cleanBdPhone, sanitizeText } from "@mogent/shared";

export const billingRouter = new Hono();

const REDIS_PAYMENT_CONFIG = "mogent:payment_gateway_config";

// Plan Definitions
export const PLANS: Record<string, { name: string; price: number; pageLimit: number; msgLimit: number; features: string[] }> = {
  FREE: {
    name: "Free Trial Plan",
    price: 0,
    pageLimit: 1,
    msgLimit: 100,
    features: [
      "1 Facebook Page Connection",
      "100 AI Automated Messages/mo",
      "Mogent Engine Turbo v3.1",
      "Basic FAQ Knowledge Base",
      "Community Support",
    ],
  },
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
// 1. GET WORKSPACE BILLING & SUBSCRIPTION STATUS (Fail-Safe & Resilient)
// -----------------------------------------------------------------------------
billingRouter.get("/", async (c) => {
  const workspaceHeader = c.req.header("x-workspace-id");
  const authHeader = c.req.header("Authorization");

  try {
    let targetWorkspaceId = workspaceHeader?.trim() || null;

    // Resolve workspace from user token if not explicitly passed
    if (!targetWorkspaceId && authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = (await verify(authHeader.substring(7), config.jwtSecret, "HS256")) as any;
        if (payload?.workspaceId) {
          targetWorkspaceId = payload.workspaceId;
        } else if (payload?.userId) {
          const mem = await prisma.workspaceMember.findFirst({
            where: { userId: payload.userId },
          });
          if (mem) targetWorkspaceId = mem.workspaceId;
        }
      } catch {}
    }

    let workspace: any = null;
    if (targetWorkspaceId) {
      workspace = await prisma.workspace.findUnique({
        where: { id: targetWorkspaceId },
        include: {
          facebookPages: { select: { id: true } },
        },
      });
    }

    if (!workspace) {
      workspace = await prisma.workspace.findFirst({
        orderBy: { updatedAt: "desc" },
        include: {
          facebookPages: { select: { id: true } },
        },
      });
    }

    const currentPlanKey = (workspace?.plan || "FREE").toUpperCase();
    const currentPlanInfo = PLANS[currentPlanKey] || PLANS.FREE;

    // Fail-safe query for payment transactions (won't crash if columns are syncing)
    let paymentHistory: any[] = [];
    try {
      if (workspace?.id) {
        paymentHistory = await prisma.paymentTransaction.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
      }
    } catch (err: any) {
      console.warn("Payment history notice:", err.message);
    }

    // Check if there is any pending payment verification
    const pendingPayment = paymentHistory.find(
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
        paymentHistory: paymentHistory,
      },
    });
  } catch (error: any) {
    console.error("Billing fetch error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. GET PAYMENT GATEWAY RECEIVER ACCOUNTS (FOR MERCHANT CHECKOUT)
// -----------------------------------------------------------------------------
billingRouter.get("/payment-config", async (c) => {
  try {
    const redisVal = await redisConnection.get(REDIS_PAYMENT_CONFIG);
    let parsed = redisVal ? JSON.parse(redisVal) : null;

    const data = {
      bkashNumber: parsed?.bkashNumber || "01711998877",
      bkashType: parsed?.bkashType || "Personal (Send Money)",
      nagadNumber: parsed?.nagadNumber || "01711998877",
      nagadType: parsed?.nagadType || "Personal (Send Money)",
      rocketNumber: parsed?.rocketNumber || "01711998877-0",
      rocketType: parsed?.rocketType || "Personal (Send Money)",
      instructions:
        parsed?.instructions ||
        "Send the exact plan amount to any number above, then submit your mobile number and Transaction ID (TrxID) for instant verification.",
    };

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. VALIDATE COUPON CODE (FOR MERCHANT CHECKOUT)
// -----------------------------------------------------------------------------
billingRouter.post("/coupons/validate", async (c) => {
  try {
    const body = await c.req.json();
    const { code, plan } = body;

    const cleanCode = sanitizeText(code, 30).toUpperCase().trim();
    if (!cleanCode) {
      return c.json({ success: false, error: "Please enter a coupon code." }, 400);
    }

    const cleanPlan = (plan || "STARTER").toUpperCase();
    const planInfo = PLANS[cleanPlan] || PLANS.STARTER;
    const basePrice = planInfo.price;

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      return c.json({ success: false, error: "Invalid or inactive coupon code." }, 404);
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return c.json({ success: false, error: "This coupon code has expired." }, 400);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return c.json({ success: false, error: "This coupon code has reached its maximum usage limit." }, 400);
    }

    if (coupon.applicablePlan && coupon.applicablePlan !== "ALL" && coupon.applicablePlan !== cleanPlan) {
      return c.json({
        success: false,
        error: `This coupon code is only valid for the ${coupon.applicablePlan} plan.`,
      }, 400);
    }

    if (coupon.minOrderAmount && basePrice < coupon.minOrderAmount) {
      return c.json({
        success: false,
        error: `Minimum order amount for this coupon is ৳${coupon.minOrderAmount}.`,
      }, 400);
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = Math.round((basePrice * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, basePrice);
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);

    return c.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalPrice: basePrice,
        finalAmount,
      },
      message: `Coupon applied! You saved ৳${discountAmount.toLocaleString()}`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. SUBMIT PAYMENT TRANSACTION (bKash, Nagad, Rocket)
// -----------------------------------------------------------------------------
billingRouter.post("/submit-payment", async (c) => {
  try {
    const body = await c.req.json();
    const { plan, method, senderNumber, trxId, couponCode, notes } = body;
    let workspaceId = c.req.header("x-workspace-id") || body.workspaceId;

    if (!plan || !senderNumber || !trxId) {
      return c.json({ success: false, error: "Plan, Sender Number, and TrxID are required" }, 400);
    }

    // Strict Bangladeshi Phone Validation
    if (!isValidBdPhone(senderNumber)) {
      return c.json({
        success: false,
        error: "Invalid Bangladeshi mobile number. Must be 11 digits (e.g. 017XXXXXXXX).",
      }, 400);
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
    let basePrice = planInfo.price;
    let appliedDiscount = 0;
    let validCouponCode: string | null = null;

    // Validate Coupon if supplied
    if (couponCode) {
      const cleanCoupon = sanitizeText(couponCode, 30).toUpperCase().trim();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCoupon },
      });

      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() <= new Date(coupon.expiresAt))) {
        if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
          if (!coupon.applicablePlan || coupon.applicablePlan === "ALL" || coupon.applicablePlan === cleanPlan) {
            validCouponCode = coupon.code;
            if (coupon.discountType === "PERCENTAGE") {
              appliedDiscount = Math.round((basePrice * coupon.discountValue) / 100);
              if (coupon.maxDiscount && appliedDiscount > coupon.maxDiscount) {
                appliedDiscount = coupon.maxDiscount;
              }
            } else {
              appliedDiscount = Math.min(coupon.discountValue, basePrice);
            }

            // Increment coupon usage
            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }
      }
    }

    const finalAmount = Math.max(0, basePrice - appliedDiscount);

    // Normalize Payment Method
    let paymentMethod: PaymentMethod = PaymentMethod.BKASH;
    if (method === "NAGAD") paymentMethod = PaymentMethod.NAGAD;
    if (method === "ROCKET") paymentMethod = PaymentMethod.ROCKET;
    if (method === "BANK_TRANSFER") paymentMethod = PaymentMethod.BANK_TRANSFER;

    // Check if TrxID was already submitted
    const cleanTrx = sanitizeText(trxId, 50).trim().toUpperCase();
    const existingTx = await prisma.paymentTransaction.findUnique({
      where: { trxId: cleanTrx },
    });

    if (existingTx) {
      return c.json({ success: false, error: "This Transaction ID has already been submitted." }, 409);
    }

    const tx = await prisma.paymentTransaction.create({
      data: {
        workspaceId,
        plan: cleanPlan,
        amount: finalAmount,
        currency: "BDT",
        method: paymentMethod,
        senderNumber: cleanBdPhone(senderNumber),
        trxId: cleanTrx,
        couponCode: validCouponCode,
        discountAmount: appliedDiscount,
        notes: sanitizeText(notes, 500) || undefined,
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
