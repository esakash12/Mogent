"use client";

import { Search, Loader2, Send, Phone, Facebook, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInbox, FilterTab } from "@/hooks/useInbox";
import { ChannelTabs } from "@/components/inbox/ChannelTabs";
import { ConversationItem } from "@/components/inbox/ConversationItem";
import { ChatHeader } from "@/components/inbox/ChatHeader";
import { MessageList } from "@/components/inbox/MessageList";
import { WhatsAppNewChatModal } from "@/components/inbox/WhatsAppNewChatModal";
import { OrderConfirmModal } from "@/components/inbox/OrderConfirmModal";

const filterTabsList: { id: FilterTab; label: string }[] = [
  { id: "ALL", label: "সব" },
  { id: "PENDING", label: "অপেক্ষমাণ" },
  { id: "AI", label: "এআই" },
  { id: "AGENT", label: "এজেন্ট" },
  { id: "RESOLVED", label: "সম্পন্ন" },
];

export default function LiveInboxPage() {
  const {
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
  } = useInbox();

  const isConvWhatsApp =
    activeConv &&
    (activeConv.channel || (activeConv.psid?.startsWith("wa_") ? "WHATSAPP" : "MESSENGER")) ===
      "WHATSAPP";

  return (
    <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden relative">
      {/* Left Sidebar: Conversations List */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r border-[#E2E8F0] flex flex-col shrink-0 bg-[#FFFFFF] transition-all",
          selectedId ? "hidden md:flex" : "flex h-full"
        )}
      >
        {/* Channel Switcher */}
        <ChannelTabs
          channelTab={channelTab}
          onSwitchChannel={handleSwitchChannel}
          messengerCount={messengerConversations.length}
          whatsAppCount={whatsAppConversations.length}
        />

        {/* Search & Action Header */}
        <div className="p-3 border-b border-[#F1F5F9] space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  channelTab === "WHATSAPP"
                    ? "Search WhatsApp chats..."
                    : "Search Messenger chats..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            {channelTab === "WHATSAPP" && (
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="p-1.5 px-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
                title="নতুন হোয়াটসঅ্যাপ চ্যাট শুরু করুন"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">নতুন চ্যাট</span>
              </button>
            )}
          </div>

          {/* 5 Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {filterTabsList.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                    active
                      ? channelTab === "WHATSAPP"
                        ? "bg-[#25D366] text-white shadow-sm"
                        : "bg-[#F59E0B] text-black shadow-sm"
                      : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] scrollbar-thin">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-[#F59E0B] animate-spin" />
              <span className="text-xs font-semibold text-[#64748B]">Loading chats...</span>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={conv.id === selectedId}
                onSelect={setSelectedId}
                onMarkSaleCompleted={handleMarkSaleCompleted}
              />
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[#64748B] space-y-3">
              <p>
                {channelTab === "WHATSAPP"
                  ? "কোনো হোয়াটসঅ্যাপ কনভারসেশন পাওয়া যায়নি।"
                  : "কোনো মেসেঞ্জার কনভারসেশন পাওয়া যায়নি।"}
              </p>
              {channelTab === "WHATSAPP" && (
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="px-4 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন হোয়াটসঅ্যাপ চ্যাট শুরু করুন</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Canvas */}
      {activeConv ? (
        <div
          className={cn(
            "flex-1 flex flex-col bg-[#F8FAFC] h-full",
            selectedId ? "flex" : "hidden md:flex"
          )}
        >
          <ChatHeader
            activeConv={activeConv}
            onBack={() => setSelectedId(null)}
            onToggleControl={handleToggleHumanControl}
            onMarkSaleCompleted={handleMarkSaleCompleted}
            onOpenOrderModal={handleOpenOrderModal}
          />

          <MessageList
            messages={messages}
            loading={messagesLoading}
            isWhatsApp={Boolean(isConvWhatsApp)}
            messagesEndRef={messagesEndRef}
          />

          {/* Chat Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                isConvWhatsApp
                  ? `Reply via WhatsApp to ${activeConv.customerName}...`
                  : `Reply as agent to ${activeConv.customerName}...`
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className={cn(
                "px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0",
                isConvWhatsApp
                  ? "bg-[#25D366] hover:bg-[#1EBE5D] text-white"
                  : "bg-[#F59E0B] hover:bg-[#D97706] text-black"
              )}
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-[#64748B] gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xs",
              channelTab === "WHATSAPP"
                ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                : "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
            )}
          >
            {channelTab === "WHATSAPP" ? (
              <Phone className="w-7 h-7" />
            ) : (
              <Facebook className="w-7 h-7 fill-current" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-[#0F172A]">
              {channelTab === "WHATSAPP"
                ? "WhatsApp Live Inbox"
                : "Facebook Messenger Inbox"}
            </p>
            <p className="text-xs text-[#64748B] max-w-sm mt-1">
              {channelTab === "WHATSAPP"
                ? "বাম পাশ থেকে একটি হোয়াটসঅ্যাপ চ্যাট সিলেক্ট করুন অথবা নতুন কাস্টমারের সাথে সরাসরি চ্যাট শুরু করুন।"
                : "Select a customer conversation from the left sidebar to view live chat."}
            </p>
          </div>
          {channelTab === "WHATSAPP" && (
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন হোয়াটসঅ্যাপ চ্যাট শুরু করুন</span>
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <WhatsAppNewChatModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        form={whatsAppForm}
        onChange={setWhatsAppForm}
        onSubmit={handleStartWhatsAppChat}
        isSubmitting={isStartingWhatsApp}
      />

      <OrderConfirmModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        activeConv={activeConv}
        form={orderForm}
        onChange={setOrderForm}
        onSubmit={handleConfirmOrder}
        isSubmitting={isSubmittingOrder}
      />
    </div>
  );
}
