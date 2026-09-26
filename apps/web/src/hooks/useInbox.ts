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

  // Sliding Window (30 items per chunk, max 60 in memory)
  const [windowOffset, setWindowOffset] = useState(0);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newIncomingCount, setNewIncomingCount] = useState(0);

  const windowOffsetRef = useRef(0);
  const hasMoreOlderRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const isScrolledDownRef = useRef(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep refs in sync
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    windowOffsetRef.current = windowOffset;
  }, [windowOffset]);

  useEffect(() => {
    hasMoreOlderRef.current = hasMoreOlder;
  }, [hasMoreOlder]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

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
  const isFetchingRef = useRef(false);

  const loadData = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    if (typeof document !== "undefined" && document.hidden && isBackground) return;

    // Background polling while scrolled down or viewing older window:
    // Protect user view: DO NOT reset scroll or overwrite list! Count new arrivals instead.
    if (isBackground && (windowOffsetRef.current > 0 || isScrolledDownRef.current)) {
      try {
        const latest = await fetchConversations({ limit: 5, skip: 0 });
        if (Array.isArray(latest) && latest.length > 0) {
          const currentTopId = conversationsRef.current[0]?.id;
          const currentTopLastTime = conversationsRef.current[0]?.lastTime;

          if (currentTopId && latest[0]?.id !== currentTopId) {
            const newCount = latest.filter((item) => !conversationsRef.current.some((c) => c.id === item.id)).length;
            setNewIncomingCount((prev) => Math.max(prev + (newCount || 1), 1));
          } else if (currentTopId && latest[0]?.id === currentTopId && latest[0]?.lastTime !== currentTopLastTime) {
            setNewIncomingCount((prev) => (prev === 0 ? 1 : prev));
          }
        }
      } catch {}
      return;
    }

    isFetchingRef.current = true;
    if (!isBackground) setLoading(true);
    try {
      const data = await fetchConversations({ limit: 30, skip: 0 });
      if (Array.isArray(data)) {
        setConversations(data);
        conversationsRef.current = data;
        setWindowOffset(0);
        windowOffsetRef.current = 0;
        setHasMoreOlder(data.length >= 30);
        hasMoreOlderRef.current = data.length >= 30;
        setNewIncomingCount(0);
        if (data.length > 0) {
          if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setSelectedId((prev) => (prev && data.some((c) => c.id === prev) ? prev : data[0].id));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load live inbox:", err);
    } finally {
      isFetchingRef.current = false;
      if (!isBackground) setLoading(false);
    }
  }, []);

  const loadOlderWindow = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreOlderRef.current) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const currentOffset = windowOffsetRef.current;
      const currentCount = conversationsRef.current.length;
      const nextSkip = currentOffset + currentCount;

      const olderData = await fetchConversations({ limit: 30, skip: nextSkip });
      if (Array.isArray(olderData)) {
        if (olderData.length === 0) {
          setHasMoreOlder(false);
          hasMoreOlderRef.current = false;
        } else {
          // Sliding window: maintain max 60 items in memory/DOM
          if (conversationsRef.current.length >= 60) {
            const newOffset = currentOffset + 30;
            const updated = [...conversationsRef.current.slice(30), ...olderData];
            setConversations(updated);
            conversationsRef.current = updated;
            setWindowOffset(newOffset);
            windowOffsetRef.current = newOffset;
          } else {
            const updated = [...conversationsRef.current, ...olderData];
            setConversations(updated);
            conversationsRef.current = updated;
          }

          if (olderData.length < 30) {
            setHasMoreOlder(false);
            hasMoreOlderRef.current = false;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load older conversations:", err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  const loadNewerWindow = useCallback(async () => {
    if (isLoadingMoreRef.current || windowOffsetRef.current <= 0) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const currentOffset = windowOffsetRef.current;
      const prevSkip = Math.max(0, currentOffset - 30);

      const newerData = await fetchConversations({ limit: 30, skip: prevSkip });
      if (Array.isArray(newerData) && newerData.length > 0) {
        const updated = [...newerData, ...conversationsRef.current.slice(0, 30)];
        setConversations(updated);
        conversationsRef.current = updated;
        setWindowOffset(prevSkip);
        windowOffsetRef.current = prevSkip;
        setHasMoreOlder(true);
        hasMoreOlderRef.current = true;
      }
    } catch (err) {
      console.error("Failed to load newer conversations:", err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  const jumpToTopLatest = useCallback(async () => {
    setNewIncomingCount(0);
    isScrolledDownRef.current = false;
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    await loadData(false);
  }, [loadData]);

  const handleListScroll = useCallback(() => {
    const el = listContainerRef.current;
    if (!el) return;

    const isDown = el.scrollTop > 80;
    isScrolledDownRef.current = isDown;

    if (el.scrollTop <= 10 && windowOffsetRef.current === 0) {
      setNewIncomingCount(0);
    }

    // Detect scroll near bottom for loading older items
    if (!isLoadingMoreRef.current && hasMoreOlderRef.current && el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      loadOlderWindow();
    }

    // Detect scroll near top when offset > 0 for loading newer items
    if (!isLoadingMoreRef.current && windowOffsetRef.current > 0 && el.scrollTop <= 40) {
      loadNewerWindow();
    }
  }, [loadOlderWindow, loadNewerWindow]);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadData(true);
      }
    }, 10000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadData(true);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
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
    setNewIncomingCount(0);
    setWindowOffset(0);
    windowOffsetRef.current = 0;
    setHasMoreOlder(true);
    hasMoreOlderRef.current = true;
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
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
    // Sliding Window & Floating Jump
    windowOffset,
    hasMoreOlder,
    isLoadingMore,
    newIncomingCount,
    listContainerRef,
    handleListScroll,
    jumpToTopLatest,
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
