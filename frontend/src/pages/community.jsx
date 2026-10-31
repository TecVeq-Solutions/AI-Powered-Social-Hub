import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Send, Sparkles, MessageSquare, Clock, 
  CheckCircle2, UserCheck, ShieldAlert, SlidersHorizontal,
  ArrowLeft, Search
} from 'lucide-react';
import { 
  getConversations, getConversationMessages, sendReply, 
  getCommunitySettings, updateCommunitySettings 
} from '../utils/api';

const FacebookIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function Community() {
  const [activeTab, setActiveTab] = useState("Comments");
  const [allConversations, setAllConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Auto-Reply Settings state
  const [settings, setSettings] = useState({ comments_auto_reply: true, dm_auto_reply: true });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [settingsError, setSettingsError] = useState("");

  // Load settings when Community page mounts
  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const data = await getCommunitySettings();
        setSettings({
          comments_auto_reply: Boolean(data.comments_auto_reply),
          dm_auto_reply: Boolean(data.dm_auto_reply),
        });
      } catch (err) {
        console.error("Failed to load community settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggleSetting = async (key) => {
    const currentVal = settings[key];
    const newVal = !currentVal;
    const updatedSettings = { ...settings, [key]: newVal };

    // Optimistically update UI
    setSettings(updatedSettings);
    setUpdatingKey(key);
    setSettingsError("");

    try {
      await updateCommunitySettings(updatedSettings);
    } catch (err) {
      console.error("Setting update failed:", err);
      setSettings(prev => ({ ...prev, [key]: currentVal }));
      setSettingsError(err.message || "Failed to update auto-reply setting.");
      setTimeout(() => setSettingsError(""), 4000);
    } finally {
      setUpdatingKey(null);
    }
  };

  // Fetch all conversations & poll every 4s for live inbox updates
  useEffect(() => {
    let isMounted = true;
    const fetchConvos = async () => {
      try {
        const data = await getConversations("all");
        if (!isMounted) return;
        setAllConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching conversations:", err);
      }
    };

    fetchConvos();
    const interval = setInterval(fetchConvos, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute segmented lists and counts
  const commentsList = allConversations.filter(c => c.type === 'comment');
  const dmsList = allConversations.filter(c => c.type === 'dm');
  const flaggedList = allConversations.filter(c => c.flagged || c.status === 'NEEDS_REVIEW');

  const tabConversations = activeTab === 'Comments'
    ? commentsList
    : (activeTab === 'DMs' || activeTab === 'Direct Messages')
      ? dmsList
      : flaggedList;

  const filteredConversations = searchQuery.trim()
    ? tabConversations.filter(c => 
        (c.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.handle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.message || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tabConversations;

  // Handle active tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const targetList = tabId === 'Comments' 
      ? commentsList 
      : (tabId === 'DMs' || tabId === 'Direct Messages') 
        ? dmsList 
        : flaggedList;
    if (targetList.length > 0) {
      setSelectedConvoId(targetList[0].id);
    } else {
      setSelectedConvoId(null);
      setMessages([]);
    }
  };

  // Automatically select first conversation if none selected
  useEffect(() => {
    if (!selectedConvoId && filteredConversations.length > 0) {
      setSelectedConvoId(filteredConversations[0].id);
    }
  }, [activeTab, allConversations, selectedConvoId]);

  // Fetch messages when selected convo changes & poll every 4s for updates
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async (isConvoChange = false) => {
      if (selectedConvoId) {
        try {
          const data = await getConversationMessages(selectedConvoId);
          if (!isMounted) return;
          setMessages(Array.isArray(data) ? data : []);
          
          if (isConvoChange) {
            setReplyText("");
          }
          
          setAllConversations(prev => prev.map(c => c.id === selectedConvoId ? { ...c, unread: false } : c));
        } catch (err) {
          console.error("Error fetching messages:", err);
        }
      } else {
        if (!isMounted) return;
        setMessages([]);
      }
    };

    fetchMessages(true);

    const interval = setInterval(() => {
      if (selectedConvoId) {
        fetchMessages(false);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedConvoId]);

  const selectedConvo = allConversations.find(c => c.id === selectedConvoId);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const hasAutoReply = messages.some(m => m.sender === 'brand' && m.is_auto_replied);
  const hasBrandReply = messages.some(m => m.sender === 'brand');

  const showSuggestedReply = lastMessage && lastMessage.sender === 'user' && lastMessage.ai_suggested_reply && (!hasBrandReply || selectedConvo?.flagged);

  const handleUseReply = () => {
    if (lastMessage && lastMessage.ai_suggested_reply) {
      setReplyText(lastMessage.ai_suggested_reply);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConvoId) return;
    setSending(true);
    try {
      await sendReply(selectedConvoId, replyText);
      setReplyText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert(`Failed to send reply via Meta API:\n\n${error.message}`);
    } finally {
      if (selectedConvoId) {
        const updatedMessages = await getConversationMessages(selectedConvoId);
        setMessages(updatedMessages);
      }
      const updatedConvos = await getConversations("all");
      setAllConversations(updatedConvos);
      setSending(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const PlatformBadge = ({ platform }) => (
    <div className={`flex items-center justify-center p-1 rounded-full ${platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'}`}>
      {platform === 'instagram' ? <InstagramIcon size={11} /> : <FacebookIcon size={11} />}
    </div>
  );

  const StatusBadge = ({ status, flagged }) => {
    if (flagged || status === 'NEEDS_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger/10 border border-danger/20 text-danger text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
          <AlertTriangle size={10} strokeWidth={2.5} />
          NEEDS REVIEW
        </span>
      );
    }
    if (status === 'AI_AUTO_REPLIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
          <Sparkles size={10} className="text-emerald-600" />
          AI AUTO-REPLIED
        </span>
      );
    }
    if (status === 'MANUAL_REPLIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
          <UserCheck size={10} />
          REPLIED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        <Clock size={10} />
        PENDING
      </span>
    );
  };

  const totalConvos = allConversations.length;
  const needsReviewCount = flaggedList.length;

  const tabsConfig = [
    { id: "Comments", label: "Comments", count: commentsList.length },
    { id: "DMs", label: "DMs", count: dmsList.length },
    { id: "Flagged", label: "Needs Review", count: flaggedList.length },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[580px] w-full gap-4 pb-2 font-sans">
      
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Community</h1>
          <p className="text-text-secondary mt-0.5 font-medium text-xs sm:text-sm">
            Monitor customer conversations, live AI auto-replies, and flagged reviews.
          </p>
        </div>
        
        <div className="flex items-center gap-5 shrink-0 self-start sm:self-end">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-lg font-bold text-text-primary">{totalConvos}</span>
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Total</span>
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-lg font-bold text-danger">{needsReviewCount}</span>
            <span className="text-[10px] font-semibold text-danger uppercase tracking-wider">Needs Review</span>
          </div>
        </div>
      </div>

      {/* ── AUTO-REPLY SETTINGS BAR ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center shrink-0">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
              Auto-Reply Automation
              <span className="text-[9px] font-extrabold uppercase bg-accent-purple/10 text-accent-purple px-1.5 py-0.5 rounded">
                Live
              </span>
            </h3>
            <p className="text-[11px] text-text-secondary font-medium">Configure whether AI automatically replies to incoming comments and messages.</p>
          </div>
        </div>

        {settingsError && (
          <div className="text-xs text-danger font-semibold bg-danger/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <AlertTriangle size={13} /> {settingsError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          {/* Comments Auto-Reply Toggle */}
          <div className="flex items-center gap-2.5 bg-surface/70 border border-border px-3 py-1.5 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-text-primary">Comments</span>
              <span className="text-[10px] font-semibold text-text-secondary">
                {loadingSettings ? "..." : settings.comments_auto_reply ? "Auto ON" : "Manual"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('comments_auto_reply')}
              disabled={loadingSettings || updatingKey === 'comments_auto_reply'}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.comments_auto_reply ? 'bg-accent-purple' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.comments_auto_reply ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Direct Messages Auto-Reply Toggle */}
          <div className="flex items-center gap-2.5 bg-surface/70 border border-border px-3 py-1.5 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-text-primary">DMs</span>
              <span className="text-[10px] font-semibold text-text-secondary">
                {loadingSettings ? "..." : settings.dm_auto_reply ? "Auto ON" : "Manual"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('dm_auto_reply')}
              disabled={loadingSettings || updatingKey === 'dm_auto_reply'}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.dm_auto_reply ? 'bg-accent-purple' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.dm_auto_reply ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN TWO-PANEL INBOX & CONVERSATION VIEW ───────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 w-full overflow-hidden">
        
        {/* ── LEFT PANEL: INBOX LIST ────────────────────────────────────────── */}
        <div className={`w-full md:w-[330px] lg:w-[370px] shrink-0 flex-col bg-white rounded-2xl border border-border shadow-2xs overflow-hidden h-full ${
          selectedConvoId ? "hidden md:flex" : "flex"
        }`}>
          
          {/* Tabs & Search Controls */}
          <div className="p-3 border-b border-border bg-surface/40 flex flex-col gap-2.5 shrink-0">
            
            {/* Segmented Tabs with Counts */}
            <div className="flex p-1 bg-border/40 rounded-xl gap-1">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id || (tab.id === "DMs" && activeTab === "Direct Messages");
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-white text-text-primary shadow-xs font-bold"
                        : "text-text-secondary hover:text-text-primary hover:bg-white/50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? tab.id === "Flagged" && tab.count > 0 ? "bg-rose-100 text-rose-700" : "bg-surface text-text-primary border border-border"
                        : tab.id === "Flagged" && tab.count > 0 ? "bg-rose-100 text-rose-700" : "bg-black/5 text-text-secondary"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Real-time Search Box */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-1.5 bg-white text-xs rounded-lg border border-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20 transition-all"
              />
            </div>
          </div>

          {/* Conversation Items List */}
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="py-12 px-4 text-center text-text-secondary font-medium text-xs flex flex-col items-center gap-2">
                <MessageSquare size={24} className="text-text-secondary/40" />
                <span>No {activeTab.toLowerCase()} found</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-accent-purple hover:underline text-[11px] font-bold"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isSelected = selectedConvoId === convo.id;
                return (
                  <div 
                    key={convo.id}
                    onClick={() => setSelectedConvoId(convo.id)}
                    className={`relative p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected 
                        ? 'border-accent-purple bg-accent-purple/5 shadow-2xs' 
                        : 'border-transparent hover:border-border hover:bg-surface'
                    }`}
                  >
                    {/* Needs Review Left Border Line */}
                    {(convo.flagged || convo.status === 'NEEDS_REVIEW') && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-danger" />
                    )}

                    <div className="flex gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-surface border border-border text-text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {getInitials(convo.user)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full">
                          <PlatformBadge platform={convo.platform} />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5 gap-2">
                          <span className={`font-bold text-xs truncate ${convo.unread ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {convo.user}
                          </span>
                          <span className="text-[10px] font-medium text-text-secondary shrink-0">
                            {convo.time}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary font-medium mb-1 truncate">
                          {convo.handle}
                        </div>
                        
                        <p className={`text-xs line-clamp-2 leading-relaxed break-words ${isSelected || convo.unread ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                          {convo.message || "(No message preview)"}
                        </p>
                        
                        <div className="mt-1.5 flex items-center justify-between">
                          <StatusBadge status={convo.status} flagged={convo.flagged} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: CONVERSATION DETAIL & COMPOSER ──────────────────── */}
        <div className={`flex-1 min-w-0 flex-col bg-white rounded-2xl border border-border shadow-2xs overflow-hidden h-full ${
          selectedConvoId ? "flex" : "hidden md:flex"
        }`}>
          {selectedConvo ? (
            <>
              {/* Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-border flex items-center justify-between bg-white shrink-0 z-10 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back to Inbox Button */}
                  <button
                    onClick={() => setSelectedConvoId(null)}
                    className="md:hidden p-1.5 -ml-1 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg shrink-0 cursor-pointer"
                    title="Back to inbox"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-surface border border-border text-text-primary flex items-center justify-center font-bold text-sm">
                      {getInitials(selectedConvo.user)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-text-primary text-sm sm:text-base truncate">
                        {selectedConvo.user}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-text-secondary mt-0.5">
                      <span className="truncate">{selectedConvo.handle}</span>
                      <span className="w-1 h-1 rounded-full bg-border shrink-0"></span>
                      <span className="flex items-center gap-1 capitalize text-text-primary shrink-0">
                        <PlatformBadge platform={selectedConvo.platform} />
                        <span>{selectedConvo.platform} {selectedConvo.type === 'dm' ? 'DM' : 'Comment'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Indicator */}
                  {selectedConvo.flagged || selectedConvo.status === 'NEEDS_REVIEW' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-danger/10 border border-danger/30 text-danger text-[11px] font-bold uppercase tracking-wider">
                      <ShieldAlert size={13} />
                      <span className="hidden sm:inline">NEEDS HUMAN REVIEW</span>
                      <span className="sm:hidden">REVIEW</span>
                    </div>
                  ) : hasAutoReply || selectedConvo.status === 'AI_AUTO_REPLIED' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles size={13} className="text-emerald-600" />
                      <span className="hidden sm:inline">AI AUTO-REPLIED ✓</span>
                      <span className="sm:hidden">AUTO-REPLIED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-wider">
                      <Clock size={13} />
                      <span>PENDING</span>
                    </div>
                  )}

                  {selectedConvo.sentiment && selectedConvo.sentiment !== "neutral" && (
                    <div className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold capitalize ${
                      selectedConvo.sentiment === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                      selectedConvo.sentiment === 'negative' ? 'bg-danger/5 border-danger/20 text-danger-700' : 
                      'bg-surface border-border text-text-secondary'
                    }`}>
                      <CheckCircle2 size={12} />
                      <span>{selectedConvo.sentiment}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-surface/30 custom-scrollbar">
                
                {/* Flagged Banner */}
                {selectedConvo.flagged && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-danger/5 border border-danger/20 text-xs text-danger-800">
                    <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold block text-sm text-danger-700">Needs Human Review</span>
                      This message was flagged as sensitive or low-confidence. Automated reply was safely suppressed. Review the suggested response below and send a reply manually.
                    </div>
                  </div>
                )}

                {/* Messages List */}
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-secondary font-medium">
                    No message history recorded for this conversation yet.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isBrand = msg.sender === 'brand';
                    const isAutoReplied = isBrand && msg.is_auto_replied;
                    const isFailed = isBrand && msg.reply_status === 'failed';

                    return (
                      <div key={msg.id} className={`flex flex-col gap-1 max-w-[90%] sm:max-w-[80%] ${isBrand ? 'self-end items-end' : 'self-start'}`}>
                        
                        {/* Auto-Reply / Failed Badges */}
                        {isAutoReplied && !isFailed && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                            <Sparkles size={10} className="text-emerald-700" />
                            AI AUTO-REPLIED
                          </div>
                        )}

                        {isFailed && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-[10px] font-bold uppercase tracking-wider mb-0.5">
                            <AlertTriangle size={11} className="text-danger" />
                            DELIVERY FAILED
                          </div>
                        )}

                        <div className={`flex gap-2.5 ${isBrand ? 'flex-row-reverse' : ''}`}>
                          {!isBrand && (
                            <div className="w-7 h-7 rounded-full bg-surface border border-border text-text-primary flex items-center justify-center font-bold text-[11px] shrink-0 mt-1">
                              {getInitials(selectedConvo.user)}
                            </div>
                          )}
                          <div className="flex flex-col gap-1">
                            <div className={`px-4 py-3 rounded-2xl shadow-2xs border text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap ${
                              isBrand 
                                ? isFailed
                                  ? 'bg-danger/10 text-danger border-danger/30 rounded-tr-xs'
                                  : isAutoReplied 
                                    ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-tr-xs border-emerald-700 shadow-xs' 
                                    : 'bg-primary-navy text-white rounded-tr-xs border-transparent' 
                                : 'bg-white border-border text-text-primary rounded-tl-xs'
                            }`}>
                              {msg.text}

                              {/* Attachment preview if user included media */}
                              {msg.media_url && (
                                <div className="mt-2">
                                  <img src={msg.media_url} alt="Attachment" className="max-w-xs rounded-xl border border-border/40 shadow-xs" />
                                </div>
                              )}
                            </div>
                            
                            <div className={`flex items-center gap-1.5 text-[10px] font-medium text-text-secondary ${isBrand ? 'justify-end mr-1' : 'ml-1'}`}>
                              {isFailed ? (
                                <span className="text-danger font-bold flex items-center gap-1">
                                  <AlertTriangle size={10} /> {msg.error_message || "Delivery failed"}
                                </span>
                              ) : isAutoReplied ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <Sparkles size={10} /> Handled by AI
                                </span>
                              ) : isBrand ? (
                                <span>Manual reply</span>
                              ) : null}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* AI Suggested Reply Card */}
                {showSuggestedReply && (
                  <div className="ml-2 sm:ml-9 mr-2 mt-2">
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-accent-purple/5 to-accent-blue/5 border border-accent-purple/20 shadow-2xs relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent-purple"></div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-accent-purple" />
                          <h3 className="text-xs font-bold text-accent-purple uppercase tracking-wide">
                            {selectedConvo.flagged ? "AI Suggested Response (Review Required)" : "AI Suggested Response"}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-accent-purple/70 uppercase bg-accent-purple/10 px-2 py-0.5 rounded">Draft</span>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium mb-4 break-words">
                        {lastMessage.ai_suggested_reply}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={handleUseReply}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>Use This Reply</span>
                        </button>
                        <button 
                          onClick={() => setReplyText("")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-text-primary border border-border text-xs font-semibold rounded-xl hover:bg-surface transition-all cursor-pointer"
                        >
                          <span>Write Custom Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>

              {/* Composer */}
              <div className="p-3 sm:p-4 border-t border-border bg-white shrink-0 z-10">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-text-primary">
                      {hasAutoReply ? "Manual Follow-up" : "Reply to Customer"}
                    </span>
                    <span className="text-[11px] text-text-secondary font-medium">
                      {hasAutoReply 
                        ? "AI auto-reply already sent. Send follow-up if needed." 
                        : "Type your reply below and click Send Reply."}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 rounded-xl border border-border focus-within:border-accent-purple/50 focus-within:ring-2 focus-within:ring-accent-purple/10 transition-all bg-surface/40 p-2">
                    <textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Write a reply to ${selectedConvo.handle}...`}
                      className="w-full min-h-[55px] max-h-[120px] p-1.5 bg-transparent text-xs sm:text-sm text-text-primary placeholder:text-text-secondary focus:outline-none resize-none font-medium leading-relaxed"
                    />
                    <div className="flex items-center justify-between px-1 pt-1 border-t border-border/50">
                      <div className="text-xs text-text-secondary">
                        {hasAutoReply && !replyText.trim() && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 size={12} /> Auto-reply completed
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sending}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-text-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span>{sending ? 'Sending...' : 'Send Reply'}</span>
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-secondary mb-3 shadow-2xs">
                <MessageSquare size={22} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1">No Conversation Selected</h3>
              <p className="text-xs text-text-secondary max-w-[260px] leading-relaxed">
                Choose a comment or direct message from the inbox to inspect the history and respond.
              </p>
            </div>
          )}
        </div>
        
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
