import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, MessageSquare, Check, Send, ArrowLeft, Clock, ChevronDown } from 'lucide-react';
import { DateFilterDropdown } from './adminUtils';

// Mock Data Types
type InboxStatus = 'unseen' | 'inprogress' | 'resolved';

interface Message {
    id: string;
    senderName: string;
    senderEmail: string;
    avatarChar: string;
    subject: string;
    preview: string;
    createdAt: string; // ISO 8601 date string
    status: InboxStatus;
    thread: ThreadMessage[];
}

interface ThreadMessage {
    id: string;
    sender: 'user' | 'admin';
    content: string;
    timestamp: string; // Keep as string for display purposes in the chat thread
}

// Generate relative dates for mock data
const now = Date.now();
const MOCK_MESSAGES: Message[] = [
    {
        id: 'msg_001',
        senderName: 'Kwame Mensah',
        senderEmail: 'kwame.mensah@example.com',
        avatarChar: 'K',
        subject: 'Order Delay Inquiry #M29A1B',
        preview: 'Hi, I noticed my order has been processing for 3 days...',
        createdAt: new Date().toISOString(), // Today
        status: 'unseen',
        thread: [
            { id: 't_001', sender: 'user', content: 'Hi, I noticed my order has been processing for 3 days. Any updates on when it might ship?', timestamp: 'Today, 10:42 AM' }
        ]
    },
    {
        id: 'msg_002',
        senderName: 'Esi Osei',
        senderEmail: 'esi.osei@example.com',
        avatarChar: 'E',
        subject: 'Refund Processing Time',
        preview: 'Thank you for approving the refund. When should I expect...',
        createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
        status: 'unseen',
        thread: [
            { id: 't_002', sender: 'user', content: 'Thank you for approving the refund for order #Z72C4D. When should I expect the funds to reflect in my account?', timestamp: 'Yesterday, 4:15 PM' }
        ]
    },
    {
        id: 'msg_003',
        senderName: 'Nana Yaa Afriyie',
        senderEmail: 'nana.yaa@example.com',
        avatarChar: 'N',
        subject: 'Trade-in Estimate Check',
        preview: 'I submitted my iPhone 13 Pro Max for trade-in...',
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        status: 'inprogress',
        thread: [
            { id: 't_003', sender: 'user', content: 'I submitted my iPhone 13 Pro Max for trade-in. The screen has a minor scratch, will that affect the GH₵4,200 estimate significantly?', timestamp: 'Mar 15, 9:20 AM' },
            { id: 't_004', sender: 'admin', content: 'Hello Nana, thank you for reaching out. Minor scratches usually result in a 10-15% deduction from the flawless estimate, pending our physical inspection. We will notify you once we receive the device.', timestamp: 'Mar 15, 11:05 AM' },
            { id: 't_005', sender: 'user', content: 'Okay, that sounds fair. I will ship it out today.', timestamp: 'Mar 15, 2:30 PM' }
        ]
    },
    {
        id: 'msg_004',
        senderName: 'Prince Addo',
        senderEmail: 'prince.addo@example.com',
        avatarChar: 'P',
        subject: 'Laptop Repair Status',
        preview: 'Is my MacBook Pro screen replacement done?',
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
        status: 'resolved',
        thread: [
            { id: 't_006', sender: 'user', content: 'Is my MacBook Pro screen replacement done?', timestamp: 'Mar 3, 1:15 PM' },
            { id: 't_007', sender: 'admin', content: 'Hi Prince, yes! Your MacBook Pro repair is complete and it is ready for pickup.', timestamp: 'Mar 3, 3:45 PM' },
            { id: 't_008', sender: 'user', content: 'Awesome, I will swing by tomorrow morning.', timestamp: 'Mar 3, 4:10 PM' }
        ]
    }
];

// Configuration Mappings
const STATUS_CONFIG: Record<InboxStatus, { label: string; colorClass: string; dotClass: string }> = {
    unseen: { label: 'Unseen', colorClass: 'bg-white/10 text-white', dotClass: 'bg-white' },
    inprogress: { label: 'In Progress', colorClass: 'bg-[#B38B21]/15 text-[#B38B21]', dotClass: 'bg-[#B38B21]' },
    resolved: { label: 'Resolved', colorClass: 'bg-emerald-500/10 text-emerald-500', dotClass: 'bg-emerald-400' }
};

const FILTER_TABS = ['All', 'Unseen', 'In Progress', 'Resolved'] as const;
const DATE_FILTER_OPTIONS = ['All Time', 'Today', 'Past 7 Days', 'Past 30 Days', 'Past 3 Months'] as const;

// Helper to format ISO date to relative string for UI list
const formatRelativeDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
};

export const AdminInbox: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Filtering State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<typeof FILTER_TABS[number]>('All');
    const [dateFilter, setDateFilter] = useState<string>('All Time');

    // UI State
    const [replyText, setReplyText] = useState('');
    const [isMobileListHidden, setIsMobileListHidden] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // Resizable Split Pane State
    const [leftPaneWidth, setLeftPaneWidth] = useState(380);
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const statusDropdownRef = useRef<HTMLDivElement>(null);

    const selectedMessage = messages.find(m => m.id === selectedId);

    // Auto-select first message on desktop if none selected
    useEffect(() => {
        if (window.innerWidth >= 1024 && !selectedId && filteredMessages.length > 0) {
            setSelectedId(filteredMessages[0].id);
        }
    }, [messages, selectedId]);

    // Click outside listener for Status Dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Resizable Split Pane Logic ---
    const startResizing = (e: React.MouseEvent) => {
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // Prevent text selection
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;

            // Clamp width between 300px and 600px
            if (newWidth >= 300 && newWidth <= 600) {
                setLeftPaneWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);
    // ----------------------------------


    const handleSelectMessage = (id: string) => {
        setSelectedId(id);
        setIsMobileListHidden(true);

        // Auto-transition 'unseen' to 'inprogress' when opened
        setMessages(prev => prev.map(m => {
            if (m.id === id && m.status === 'unseen') {
                return { ...m, status: 'inprogress' };
            }
            return m;
        }));
    };

    const handleBackToList = () => {
        setIsMobileListHidden(false);
    };

    const handleStatusChange = (e: React.MouseEvent, id: string, newStatus: InboxStatus) => {
        e.stopPropagation();
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
        setIsStatusDropdownOpen(false);
    };

    const handleSendReply = () => {
        if (!replyText.trim() || !selectedId) return;

        setMessages(prev => prev.map(m => {
            if (m.id === selectedId) {
                return {
                    ...m,
                    status: 'inprogress', // Replying implies it is still in progress
                    thread: [
                        ...m.thread,
                        {
                            id: `reply_${Date.now()}`,
                            sender: 'admin',
                            content: replyText,
                            timestamp: 'Just now'
                        }
                    ]
                };
            }
            return m;
        }));
        setReplyText('');
    };

    // --- Filtering Logic ---
    const isDateInRange = (dateString: string, filterStr: string) => {
        if (filterStr === 'All Time') return true;
        const itemDate = new Date(dateString);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filterStr) {
            case 'Today':
                return itemDate >= startOfToday;
            case 'Past 7 Days':
                return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case 'Past 30 Days':
                return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case 'Past 3 Months':
                return itemDate >= new Date(now.setMonth(now.getMonth() - 3));
            default:
                return true;
        }
    };

    const filteredMessages = messages.filter(m => {
        const query = searchQuery.toLowerCase();

        // 1. Text Search
        const matchQ = m.senderName.toLowerCase().includes(query) ||
            m.subject.toLowerCase().includes(query) ||
            m.senderEmail.toLowerCase().includes(query);

        // 2. Status Match
        const matchS = statusFilter === 'All' ||
            (statusFilter === 'Unseen' && m.status === 'unseen') ||
            (statusFilter === 'In Progress' && m.status === 'inprogress') ||
            (statusFilter === 'Resolved' && m.status === 'resolved');

        // 3. Date Match
        const matchD = isDateInRange(m.createdAt, dateFilter);

        return matchQ && matchS && matchD;
    });
    // -------------------------

    return (
        <div ref={containerRef} className="h-[calc(100vh-140px)] bg-[#0a0a0a] rounded-2xl border border-white/5 flex overflow-hidden lg:relative">

            {/* ── Left Pane: Master List ── */}
            <div
                style={{ width: window.innerWidth >= 1024 ? leftPaneWidth : '100%' }}
                className={`flex-shrink-0 flex flex-col transition-transform duration-300 lg:transition-none bg-[#0a0a0a] z-10
            ${isMobileListHidden ? '-translate-x-full lg:translate-x-0 absolute lg:relative h-full' : 'translate-x-0 relative h-full'}`}
            >
                {/* Header Area */}
                <div className="p-4 sm:p-5 border-b border-white/5 bg-[#060606] relative z-20">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black italic uppercase text-white flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#B38B21]" />
                            Messaging
                        </h2>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-md flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#B38B21]" />
                            {messages.filter(m => m.status === 'unseen' || m.status === 'inprogress').length} Active
                        </div>
                    </div>

                    {/* Filter Controls */}
                    <div className="space-y-3">
                        {/* Search & Date */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#B38B21]/50 transition-colors"
                                />
                            </div>
                            {/* Compact Custom Date Dropdown */}
                            <DateFilterDropdown
                                value={dateFilter}
                                onChange={setDateFilter}
                                options={DATE_FILTER_OPTIONS}
                            />
                        </div>

                        {/* Status Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setStatusFilter(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all 
                                ${statusFilter === tab ? 'bg-[#B38B21] text-black shadow-[0_0_15px_rgba(179,139,33,0.3)]' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredMessages.length === 0 ? (
                        <div className="p-8 text-center text-white/30">
                            <Check size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No conversations found.</p>
                        </div>
                    ) : (
                        filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => handleSelectMessage(msg.id)}
                                className={`p-4 border-b border-white/5 cursor-pointer relative group transition-colors
                            ${selectedId === msg.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            >
                                {/* Status Left Accent Bar (Unseen) */}
                                {msg.status === 'unseen' && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#B38B21] rounded-r-full" />
                                )}

                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-sm font-black text-white shrink-0 relative">
                                        {msg.avatarChar}
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2px] border-[#0a0a0a] ${STATUS_CONFIG[msg.status].dotClass}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className={`text-sm truncate pr-2 ${msg.status === 'unseen' ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
                                                {msg.senderName}
                                            </h3>
                                            <span className={`text-[10px] shrink-0 ${msg.status === 'unseen' ? 'text-[#B38B21] font-bold' : 'text-white/40'}`}>
                                                {formatRelativeDate(msg.createdAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${STATUS_CONFIG[msg.status].colorClass}`}>
                                                {STATUS_CONFIG[msg.status].label}
                                            </span>
                                            <p className={`text-xs truncate ${msg.status === 'unseen' ? 'text-white/90 font-medium' : 'text-white/60'}`}>
                                                {msg.subject}
                                            </p>
                                        </div>

                                        <p className="text-[11px] text-white/40 truncate">
                                            {msg.preview}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Resizable Handle (Desktop Only) ── */}
            <div
                onMouseDown={startResizing}
                className="w-1 hidden lg:block bg-white/5 hover:bg-[#B38B21]/50 active:bg-[#B38B21] cursor-col-resize z-30 transition-colors"
            />

            {/* ── Right Pane: Detail View ── */}
            <div
                className={`flex-1 flex flex-col bg-[#060606] transition-transform duration-300 absolute lg:relative w-full h-full z-20
            ${!isMobileListHidden && window.innerWidth < 1024 ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}`}
            >
                {selectedMessage ? (
                    <>
                        {/* Detail Header */}
                        <div className="h-[73px] border-b border-white/5 px-4 sm:px-6 flex items-center justify-between bg-[#0a0a0a] shrink-0">
                            <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={handleBackToList}
                                    className="lg:hidden p-2 -ml-2 text-white/60 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={18} />
                                </button>

                                <div className="w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-sm font-black text-white shrink-0 relative">
                                    {selectedMessage.avatarChar}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-white truncate">
                                        {selectedMessage.senderName}
                                    </h2>
                                    <p className="text-[11px] font-medium text-white/40 truncate">
                                        {selectedMessage.senderEmail}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* ClickUp Style Status Dropdown */}
                                <div className="relative" ref={statusDropdownRef}>
                                    <button
                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-white/20 ${STATUS_CONFIG[selectedMessage.status].colorClass}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full bg-current opacity-80`} />
                                        {STATUS_CONFIG[selectedMessage.status].label}
                                        <ChevronDown size={12} className={`transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isStatusDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                                            <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                                                <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">Set Message Status</span>
                                            </div>
                                            {(['unseen', 'inprogress', 'resolved'] as InboxStatus[]).map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={(e) => handleStatusChange(e, selectedMessage.id, status)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors group"
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dotClass} opacity-60 group-hover:opacity-100`} />
                                                    <span className={`text-xs font-bold ${selectedMessage.status === status ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                                                        {STATUS_CONFIG[status].label}
                                                    </span>
                                                    {selectedMessage.status === status && <Check size={14} className="text-white ml-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                                <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:flex">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Thread Header (Subject) */}
                        <div className="px-4 sm:px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center justify-between">
                                <h1 className="text-base font-bold text-white/90 truncate">{selectedMessage.subject}</h1>
                                <span className="shrink-0 flex items-center gap-1.5 text-[10px] uppercase font-bold text-white/30 tracking-wider bg-white/5 px-2 py-1 rounded-md">
                                    <Clock size={10} /> {new Date(selectedMessage.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {/* Conversation History (WhatsApp Style) */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-transparent" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.01) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                            {selectedMessage.thread.map((t) => {
                                const isAdmin = t.sender === 'admin';
                                return (
                                    <div key={t.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                            {/* Sender Meta */}
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-[#B38B21]' : 'text-white/40'}`}>
                                                    {isAdmin ? 'BlackBox Admin' : selectedMessage.senderName}
                                                </span>
                                                <span className="text-[9px] text-white/20 font-medium">
                                                    {t.timestamp}
                                                </span>
                                            </div>

                                            {/* Chat Bubble with Tail */}
                                            <div className="relative group">
                                                {/* Tail SVG */}
                                                {isAdmin ? (
                                                    <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -right-[7px] text-[#B38B21]/15">
                                                        <path opacity=".15" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" fill="currentColor"></path>
                                                        <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" fill="currentColor"></path>
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-[7px] text-[#222]">
                                                        <path opacity=".15" d="M2.812 1H8v11.193L1.533 3.568C.474 2.156 1.042 1 2.812 1z" fill="currentColor"></path>
                                                        <path d="M2.812 0H8v11.193L1.533 2.568C.474 1.156 1.042 0 2.812 0z" fill="currentColor"></path>
                                                    </svg>
                                                )}

                                                <div className={`px-4 py-3 rounded-2xl shadow-sm text-[13px] leading-relaxed relative z-10 
                                            ${isAdmin
                                                        ? 'bg-[#B38B21]/15 text-white/90 rounded-tr-sm border border-[#B38B21]/20'
                                                        : 'bg-[#222] text-white/90 rounded-tl-sm border border-white/5'
                                                    }`}>
                                                    {t.content}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area (Floating WhatsApp Style) */}
                        <div className="p-4 sm:px-6 sm:py-5 pb-6 sm:pb-8 bg-transparent w-full">
                            <div className="flex items-end gap-2 sm:gap-3 lg:gap-4 max-w-4xl mx-auto">
                                {/* Attachment Icon (WhatsApp Style) */}
                                <button className="w-10 h-10 sm:w-[52px] sm:h-[52px] rounded-full sm:flex items-center justify-center shrink-0 text-white/40 hover:text-white hover:bg-white/5 transition-colors hidden">
                                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                </button>

                                <div className="flex-1 bg-[#222] border border-white/5 rounded-3xl overflow-hidden focus-within:border-[#B38B21]/30 focus-within:bg-[#2a2a2a] transition-colors flex items-end shadow-2xl drop-shadow-xl relative z-10">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a message..."
                                        className="w-full bg-transparent text-sm text-white placeholder:text-white/40 px-5 sm:px-6 py-3.5 sm:py-4 max-h-[150px] min-h-[52px] resize-none focus:outline-none scrollbar-hide"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim()}
                                    className={`w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center shrink-0 transition-all shadow-xl relative z-10
                                ${replyText.trim()
                                            ? 'bg-[#B38B21] text-black hover:bg-[#c29824] hover:scale-105 active:scale-95'
                                            : 'bg-[#222] border border-white/5 text-white/20 cursor-not-allowed'}`}
                                >
                                    <Send size={18} className={`${replyText.trim() ? '-ml-1' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // Empty State (Desktop only if no messages)
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 hidden lg:flex bg-[#060606]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inset">
                            <MessageSquare size={24} className="text-white/20" />
                        </div>
                        <h3 className="text-white font-bold mb-2">No Thread Selected</h3>
                        <p className="text-sm text-white/40 max-w-xs leading-relaxed">Choose an active message from the sidebar to continue the conversation or manage its status.</p>
                    </div>
                )}
            </div>

        </div>
    );
};
