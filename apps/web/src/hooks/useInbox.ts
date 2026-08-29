"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchConversations,
  fetchMessages,
  sendMessage as apiSendMessage,
  toggleConversationMode as apiToggleMode,
  markSaleCompleted as apiMarkSaleCompleted,
  startWhatsAppConversation as apiStartWhatsApp,
  createOrderManual as apiCreateOrder,
} from "@/lib/api";
import { toast } from "@/lib/toast";

export interface Message {
  id: string;
  sender: "CUSTOMER" | "AI" | "HUMAN";
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  customerId?: string;
  customerName: string;
  channel?: "MESSENGER" | "WHATSAPP" | string;
  psid: string;
  avatar?: string;
  profilePic?: string;
  status: "OPEN" | "HANDOFF_REQUIRED" | "RESOLVED";
  isHumanControl: boolean;
  phone?: string;
  address?: string;
  lastMessage: string;
  lastTime: string;
  tag?: string;
  pageName?: string;
  pageId?: string;
  unresolvedReason?: string | null;
  unresolvedQuestion?: string | null;
}

export type FilterTab = "ALL" | "PENDING" | "AI" | "AGENT" | "RESOLVED";
export type ChannelTab = "MESSENGER" | "WHATSAPP";

export function useInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelTab, setChannelTab] = useState<ChannelTab>("MESSENGER");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // WhatsApp New Chat Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [isStartingWhatsApp, setIsStartingWhatsApp] = useState(false);
  const [whatsAppForm, setWhatsAppForm] = useState({
    phone: "",
    name: "",
    initialMessage: "",
  });

  // Quick Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    productName: "",
    totalAmount: "",
    deliveryAddress: "",
    customerPhone: "",
    paymentMethod: "COD",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await fetchConversations();
      if (Array.isArray(data)) {
        setConversations(data);
        if (data.length > 0) {
          if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setSelectedId((prev) => (prev && data.some((c) => c.id === prev) ? prev : data[0].id));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load live inbox:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (!selectedId) return;
    setMessagesLoading(true);
    fetchMessages(selectedId)
      .then((msgs) => {
        if (Array.isArray(msgs)) setMessages(msgs);
      })
      .catch((err) => console.error("Failed to load messages:", err))
      .finally(() => setMessagesLoading(false));
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === selectedId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedId) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    const optimisticMsg: Message = {
      id: Date.now().toString(),
      sender: "HUMAN",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await apiSendMessage(selectedId, textToSend);
      if (res?.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? { ...m, id: res.data.id } : m))
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleHumanControl = async () => {
    if (!activeConv) return;
    const newControl = !activeConv.isHumanControl;

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConv.id ? { ...c, isHumanControl: newControl } : c))
    );

    try {
      await apiToggleMode(activeConv.id, newControl);
      toast.success(newControl ? "Human Takeover Active" : "AI Mode Active");
    } catch (err) {
      console.error("Toggle control error:", err);
    }
  };

  const handleMarkSaleCompleted = async (convId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetConv = conversations.find((c) => c.id === convId);
    if (!targetConv) return;

    const isCurrentlyResolved = targetConv.status === "RESOLVED";
    const newStatus = isCurrentlyResolved ? "OPEN" : "RESOLVED";

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, status: newStatus } : c))
    );

    try {
      const res = await apiMarkSaleCompleted(convId);
      if (res?.success) {
        toast.success(
          newStatus === "RESOLVED" ? "Sale marked as Completed! ✅" : "Sale status set to Open"
        );
      }
    } catch (err) {
      console.error("Mark sale error:", err);
    }
  };

  const handleStartWhatsAppChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppForm.phone.trim()) {
      toast.error("ফোন নম্বর আবশ্যক", { description: "অনুগ্রহ করে কাস্টমারের ফোন নম্বর লিখুন।" });
      return;
    }

    setIsStartingWhatsApp(true);
    try {
      const res = await apiStartWhatsApp({
        phoneNumber: whatsAppForm.phone.trim(),
        name: whatsAppForm.name.trim() || undefined,
        initialMessage: whatsAppForm.initialMessage.trim() || undefined,
      });

      if (res?.success && res.data) {
        toast.success("হোয়াটসঅ্যাপ চ্যাট শুরু হয়েছে! 💬", {
          description: `${res.data.customerName || whatsAppForm.phone}-এর সাথে চ্যাট সংযুক্ত।`,
        });
        setShowWhatsAppModal(false);
        setWhatsAppForm({ phone: "", name: "", initialMessage: "" });
        setChannelTab("WHATSAPP");
        await loadData();
        setSelectedId(res.data.id);
      } else {
        toast.error("হোয়াটসঅ্যাপ চ্যাট শুরু করা যায়নি", {
          description: res?.error || "অনুগ্রহ করে আবার চেষ্টা করুন।",
        });
      }
    } catch (err: any) {
      toast.error("হোয়াটসঅ্যাপ চ্যাট তৈরিতে সমস্যা হয়েছে");
    } finally {
      setIsStartingWhatsApp(false);
    }
  };

  const handleOpenOrderModal = () => {
    if (!activeConv) return;
    setOrderForm({
      productName: "",
      totalAmount: "",
      deliveryAddress: activeConv.address || "",
      customerPhone: activeConv.phone || (activeConv.psid?.startsWith("wa_") ? activeConv.psid.replace("wa_", "") : ""),
      paymentMethod: "COD",
    });
    setShowOrderModal(true);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv) return;

    if (!orderForm.productName.trim() || !orderForm.totalAmount) {
      toast.error("Required fields missing", {
        description: "Please enter product name and total amount.",
      });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await apiCreateOrder({
        customerName: activeConv.customerName,
        customerPhone: orderForm.customerPhone || activeConv.phone || undefined,
        deliveryAddress: orderForm.deliveryAddress || activeConv.address || undefined,
        productName: orderForm.productName,
        totalAmount: Number(orderForm.totalAmount),
        paymentMethod: orderForm.paymentMethod,
        status: "CONFIRMED",
        pageId: activeConv.pageId,
      });

      if (res?.success && res.data) {
        const confirmText = `✅ Order Confirmed!\nOrder ID: #${res.data.orderNumber || res.data.id?.slice(-6)?.toUpperCase()}\nItems: ${orderForm.productName}\nAmount: ৳${orderForm.totalAmount}\nPayment: ${orderForm.paymentMethod}\n\nThank you for shopping with us!`;

        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const optimisticMsg: Message = {
          id: Date.now().toString(),
          sender: "HUMAN",
          text: confirmText,
          time: now,
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        apiSendMessage(activeConv.id, confirmText).catch(() => {});

        setShowOrderModal(false);
        toast.success("Order Confirmed & Logged! 🛍️", {
          description: `Order #${res.data.id?.slice(-6)?.toUpperCase() || "ORD"} created. Visible in Orders dashboard.`,
        });
      } else {
        toast.error("Failed to confirm order", {
          description: res?.error || "Please check details and try again.",
        });
      }
    } catch (err: any) {
      console.error("Order confirmation error:", err);
      toast.error("Network error while creating order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const messengerConversations = conversations.filter(
    (c) => (c.channel || (c.psid?.startsWith("wa_") ? "WHATSAPP" : "MESSENGER")) !== "WHATSAPP"
  );
  const whatsAppConversations = conversations.filter(
    (c) => (c.channel || (c.psid?.startsWith("wa_") ? "WHATSAPP" : "MESSENGER")) === "WHATSAPP"
  );

  const currentChannelList = channelTab === "MESSENGER" ? messengerConversations : whatsAppConversations;

  const filteredConversations = currentChannelList.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));

    if (activeTab === "ALL") return matchesSearch;
    if (activeTab === "PENDING") return matchesSearch && (c.status === "HANDOFF_REQUIRED" || c.isHumanControl);
    if (activeTab === "AI") return matchesSearch && !c.isHumanControl && c.status !== "RESOLVED";
    if (activeTab === "AGENT") return matchesSearch && c.isHumanControl;
    if (activeTab === "RESOLVED") return matchesSearch && c.status === "RESOLVED";
    return matchesSearch;
  });

  const handleSwitchChannel = (newChannel: ChannelTab) => {
    setChannelTab(newChannel);
    const targetList = newChannel === "MESSENGER" ? messengerConversations : whatsAppConversations;
    if (targetList.length > 0) {
      setSelectedId(targetList[0].id);
    } else {
      setSelectedId(null);
    }
  };

  return {
    conversations,
    filteredConversations,
    messengerConversations,
    whatsAppConversations,
    selectedId,
    setSelectedId,
    activeConv,
    messages,
    inputText,
    setInputText,
    searchQuery,
    setSearchQuery,
    channelTab,
    setChannelTab,
    activeTab,
    setActiveTab,
    loading,
    messagesLoading,
    isSending,
    messagesEndRef,
    handleSendMessage,
    handleToggleHumanControl,
    handleMarkSaleCompleted,
    handleSwitchChannel,
    // WhatsApp modal
    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsAppForm,
    setWhatsAppForm,
    isStartingWhatsApp,
    handleStartWhatsAppChat,
    // Order modal
    showOrderModal,
    setShowOrderModal,
    orderForm,
    setOrderForm,
    isSubmittingOrder,
    handleOpenOrderModal,
    handleConfirmOrder,
  };
}
