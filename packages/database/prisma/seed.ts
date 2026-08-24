import { PrismaClient, Role, AiMode, ConversationStatus, MessageSender, MediaType, MessageStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Mogent Database Seeding...");

  // 1. Create or Find User
  const user = await prisma.user.upsert({
    where: { email: "shohag.tech@gmail.com" },
    update: {},
    create: {
      email: "shohag.tech@gmail.com",
      name: "Shohag Admin",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
    },
  });
  console.log(`👤 User created/found: ${user.email} (${user.id})`);

  // 2. Create or Find Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "shohag-workspace" },
    update: {
      whatsAppMode: "ON_DEMAND",
      whatsAppNumber: "+8801819234567",
      hotlineNumber: "09612345678",
      officeAddress: "Level 4, House 12, Road 4, Dhanmondi, Dhaka",
      whatsAppPrefillText: "Hello! I saw your products on Facebook and want to place an order.",
    },
    create: {
      name: "Shohag Tech & Commerce",
      slug: "shohag-workspace",
      whatsAppMode: "ON_DEMAND",
      whatsAppNumber: "+8801819234567",
      hotlineNumber: "09612345678",
      officeAddress: "Level 4, House 12, Road 4, Dhanmondi, Dhaka",
      whatsAppPrefillText: "Hello! I saw your products on Facebook and want to place an order.",
    },
  });
  console.log(`🏢 Workspace: ${workspace.name} (${workspace.id})`);

  // 3. Link Member to Workspace
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: { role: Role.OWNER },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: Role.OWNER,
    },
  });

  // 4. Create Facebook Pages
  const page1 = await prisma.facebookPage.upsert({
    where: { pageId: "10928491823901" },
    update: {},
    create: {
      workspaceId: workspace.id,
      pageId: "10928491823901",
      name: "TechGadgets BD",
      category: "Electronics",
      encryptedAccessToken: "enc_mock_token_techgadgets_2026",
      tokenIv: "mock_iv_16_bytes_00",
      tokenTag: "mock_tag_16_bytes_00",
      verifyToken: "mogent_verify_techgadgets_secret",
      webhookSubscribed: true,
      aiMode: AiMode.AUTO,
      businessName: "TechGadgets Bangladesh",
      defaultLanguage: "bn",
    },
  });

  const page2 = await prisma.facebookPage.upsert({
    where: { pageId: "49204918204918" },
    update: {},
    create: {
      workspaceId: workspace.id,
      pageId: "49204918204918",
      name: "Fashion House BD",
      category: "Apparel & Fashion",
      encryptedAccessToken: "enc_mock_token_fashionhouse_2026",
      tokenIv: "mock_iv_16_bytes_01",
      tokenTag: "mock_tag_16_bytes_01",
      verifyToken: "mogent_verify_fashion_secret",
      webhookSubscribed: true,
      aiMode: AiMode.AUTO,
      businessName: "Fashion House BD",
      defaultLanguage: "bn",
    },
  });
  console.log(`🌐 Facebook Pages seeded: ${page1.name}, ${page2.name}`);

  // 5. Seed Products
  const products = [
    {
      name: "Ultra Smartwatch Pro 2026",
      price: 2450,
      regularPrice: 3200,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
      category: "Smart Electronics",
      inStock: true,
      salesCount: 340,
      description: "AMOLED 1.9-inch display, 7-day battery backup, Heart Rate & SpO2 sensor, Bluetooth Calling.",
    },
    {
      name: "Wireless ANC Pro Earbuds",
      price: 1900,
      regularPrice: 2500,
      imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60",
      category: "Audio",
      inStock: true,
      salesCount: 215,
      description: "Active Noise Cancellation, 32-hour playback with charging case, Deep bass sound.",
    },
    {
      name: "Magnetic 65W GaN Fast Charger",
      price: 1250,
      regularPrice: 1600,
      imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=60",
      category: "Accessories",
      inStock: false,
      salesCount: 88,
      description: "Triple port (2 Type-C, 1 USB-A), supports laptop & mobile fast charging simultaneously.",
    },
  ];

  for (const prod of products) {
    const existing = await prisma.product.findFirst({
      where: { workspaceId: workspace.id, name: prod.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          workspaceId: workspace.id,
          ...prod,
        },
      });
    }
  }
  console.log(`🏷️ Products seeded into catalog.`);

  // 6. Seed Customers
  const customer1 = await prisma.customer.upsert({
    where: {
      facebookPageId_psid: {
        facebookPageId: page1.id,
        psid: "849204918239102",
      },
    },
    update: {},
    create: {
      facebookPageId: page1.id,
      psid: "849204918239102",
      firstName: "Tanvir",
      lastName: "Khan",
      phoneNumber: "01819234567",
      deliveryAddress: "House 12, Road 4, Dhanmondi, Dhaka",
      tags: ["Interested in Watch", "COD Buyer"],
      totalOrders: 2,
      totalSpent: 4900,
      sentimentScore: 0.85,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      facebookPageId_psid: {
        facebookPageId: page1.id,
        psid: "593019284719283",
      },
    },
    update: {},
    create: {
      facebookPageId: page1.id,
      psid: "593019284719283",
      firstName: "Sabbir",
      lastName: "Mahmud",
      phoneNumber: "01711998877",
      deliveryAddress: "Agrabad, Chattogram",
      tags: ["Complaint", "Defect Display"],
      totalOrders: 1,
      totalSpent: 2450,
      sentimentScore: -0.85,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: {
      facebookPageId_psid: {
        facebookPageId: page1.id,
        psid: "910284918239019",
      },
    },
    update: {},
    create: {
      facebookPageId: page1.id,
      psid: "910284918239019",
      firstName: "Sadia",
      lastName: "Afrin",
      phoneNumber: "01755112233",
      deliveryAddress: "Flat 4B, Sector 11, Uttara, Dhaka",
      tags: ["Payment Done", "ANC Earbuds"],
      totalOrders: 1,
      totalSpent: 3800,
      sentimentScore: 0.95,
    },
  });
  console.log(`👥 Customers seeded: Tanvir Khan, Sabbir Mahmud, Sadia Afrin.`);

  // 7. Seed Conversations & Messages
  const conv1 = await prisma.conversation.upsert({
    where: { id: "conv-seeded-01" },
    update: {},
    create: {
      id: "conv-seeded-01",
      facebookPageId: page1.id,
      customerId: customer1.id,
      status: ConversationStatus.OPEN,
      isHumanControl: false,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        sender: MessageSender.CUSTOMER,
        content: "আসসালামু আলাইকুম, আপনাদের এই স্মার্ট ওয়াচটি এভেইলেবল আছে?",
        status: MessageStatus.READ,
      },
      {
        conversationId: conv1.id,
        sender: MessageSender.AI,
        content: "ওয়ালাইকুম আসসালাম! জি স্যার, আমাদের স্মার্ট ওয়াচটি বর্তমানে স্টকে এভেইলেবল আছে। আপনি চাইলে এখনই অর্ডার করতে পারেন।",
        thinkingProcess: "User asked about smartwatch availability. Confirmed in-stock status (2450 BDT).",
        status: MessageStatus.SENT,
      },
      {
        conversationId: conv1.id,
        sender: MessageSender.CUSTOMER,
        content: "ক্যাশ অন ডেলিভারি দেওয়া যাবে কি?",
        status: MessageStatus.READ,
      },
      {
        conversationId: conv1.id,
        sender: MessageSender.AI,
        content: "জি তানভির ভাই, সারা বাংলাদেশে আমাদের ক্যাশ অন ডেলিভারি সুবিধা রয়েছে। ঢাকার ভেতরে ডেলিভারি চার্জ ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। আপনার ঠিকানা ও ফোন নাম্বারটি দিন।",
        thinkingProcess: "User inquired about COD. Injected standard delivery rates (60 BDT Dhaka, 120 BDT outside).",
        status: MessageStatus.SENT,
      },
    ],
    skipDuplicates: true,
  });

  // 8. Seed Knowledge Base Items
  const knowledgeData = [
    {
      title: "Smartwatch Ultra Pro Specs & Pricing",
      category: "PRODUCT_CATALOG",
      content: "Product: Smartwatch Ultra Pro 2026. Price: 2,450 BDT (Regular 3,200 BDT). Features: AMOLED 1.9-inch display, 7-day battery backup, Heart rate & SpO2 sensor, Bluetooth Calling. In stock: Yes.",
      priority: 10,
    },
    {
      title: "Delivery Charges & Return Policy",
      category: "POLICY",
      content: "Delivery charge inside Dhaka: 60 BDT (1-2 days). Outside Dhaka: 120 BDT (2-3 days). Cash on Delivery available nationwide. 7 days replacement guarantee for manufacturing defects.",
      priority: 9,
    },
    {
      title: "How to Place an Order (FAQ)",
      category: "FAQ",
      content: "To place an order, customers need to provide their Name, Mobile Number, Product Quantity/Color, and Full Delivery Address. We confirm via call or SMS.",
      priority: 8,
    },
  ];

  for (const k of knowledgeData) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { workspaceId: workspace.id, title: k.title },
    });
    if (!existing) {
      await prisma.knowledgeBase.create({
        data: {
          workspaceId: workspace.id,
          ...k,
        },
      });
    }
  }

  // 9. Seed Orders
  const order1 = await prisma.order.upsert({
    where: { orderNumber: "ORD-8921" },
    update: {},
    create: {
      customerId: customer1.id,
      orderNumber: "ORD-8921",
      items: [{ name: "Ultra Smartwatch Pro (Black)", qty: 1, price: 2450 }],
      totalAmount: 2450,
      currency: "BDT",
      status: "CONFIRMED",
      customerPhone: "01819234567",
      shippingAddress: "House 12, Road 4, Dhanmondi, Dhaka",
    },
  });

  const order2 = await prisma.order.upsert({
    where: { orderNumber: "ORD-8920" },
    update: {},
    create: {
      customerId: customer3.id,
      orderNumber: "ORD-8920",
      items: [{ name: "Wireless ANC Earbuds (White)", qty: 2, price: 1900 }],
      totalAmount: 3800,
      currency: "BDT",
      status: "SHIPPED",
      customerPhone: "01755112233",
      shippingAddress: "Flat 4B, Uttara Sector 11, Dhaka",
    },
  });

  console.log(`📦 Orders seeded: ${order1.orderNumber}, ${order2.orderNumber}`);
  console.log("✅ Mogent Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
