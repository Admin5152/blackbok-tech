import React from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send } from 'lucide-react';
import { useAppContext } from '../App';

export const Contact: React.FC = () => {
    const { theme } = useAppContext();
    const isLight = theme === 'light';

    return (
        <div className={`min-h-screen py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 transition-colors duration-500 flex flex-col items-center ${isLight ? 'bg-[#F9F9F9] text-black' : 'bg-[#0D0D0E] text-white'}`}>
            <div className="w-full max-w-[1200px]">

                {/* Header Section */}
                <div className="text-center mb-12 lg:mb-20 max-w-2xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-4 lg:mb-6 uppercase">
                        Get In <span className="text-[#CDA032]">Touch</span>
                    </h1>
                    <p className={`text-[12px] sm:text-[13px] lg:text-[15px] font-semibold leading-relaxed px-4 ${isLight ? 'text-black/70' : 'text-white/80'}`}>
                        Have a question about a product, repair, or trade-in?
                        Our team of tech specialists is ready to assist you
                        with premium support.
                    </p>
                </div>

                {/* Responsive Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

                    {/* Form Card */}
                    <div className={`lg:col-span-7 p-6 sm:p-8 lg:p-10 rounded-[2.5rem] relative overflow-hidden glow-surface shadow-xl border ${isLight ? 'bg-white shadow-black/5 border-gray-200' : 'bg-[var(--bb-surface)] shadow-black/40 border-[var(--bb-border)]'}`}>
                        {/* Corner Marks (Trade-in aesthetic) */}
                        <div className="pointer-events-none absolute inset-0 z-0">
                            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#B38B21]/50" />
                            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#B38B21]/50" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#B38B21]/50" />
                            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#B38B21]/50" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md leading-none" style={{ backgroundColor: '#B38B21' }}>01</span>
                                <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Send a Message</h2>
                            </div>

                            <form className="space-y-5 lg:space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Message Dispatched!"); }}>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 lg:text-[11px] opacity-60">Full Name</label>
                                    <input
                                        type="text"
                                        className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none transition-all border ${isLight ? 'bg-[#F0F0F0] text-black border-transparent focus:border-[#CDA032]/50 focus:bg-white' : 'bg-white/5 border-white/20 text-white placeholder-white/30 focus:border-white/40 focus:bg-white/10'}`}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 lg:text-[11px] opacity-60">Email Address</label>
                                    <input
                                        type="email"
                                        className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none transition-all border ${isLight ? 'bg-[#F0F0F0] text-black border-transparent focus:border-[#CDA032]/50 focus:bg-white' : 'bg-white/5 border-white/20 text-white placeholder-white/30 focus:border-white/40 focus:bg-white/10'}`}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 lg:text-[11px] opacity-60">Phone Number</label>
                                    <input
                                        type="tel"
                                        className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none transition-all border ${isLight ? 'bg-[#F0F0F0] text-black border-transparent focus:border-[#CDA032]/50 focus:bg-white' : 'bg-white/5 border-white/20 text-white placeholder-white/30 focus:border-white/40 focus:bg-white/10'}`}
                                        placeholder="+233 55 123 4567"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 lg:text-[11px] opacity-60">Subject</label>
                                    <input
                                        type="text"
                                        className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none transition-all border ${isLight ? 'bg-[#F0F0F0] text-black border-transparent focus:border-[#CDA032]/50 focus:bg-white' : 'bg-white/5 border-white/20 text-white placeholder-white/30 focus:border-white/40 focus:bg-white/10'}`}
                                        placeholder="Order delivery..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 lg:text-[11px] opacity-60">Message</label>
                                    <textarea
                                        rows={4}
                                        className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none transition-all border resize-none ${isLight ? 'bg-[#F0F0F0] text-black border-transparent focus:border-[#CDA032]/50 focus:bg-white' : 'bg-white/5 border-white/20 text-white placeholder-white/30 focus:border-white/40 focus:bg-white/10'}`}
                                        placeholder="Include all necessary details..."
                                        required
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full mt-4 lg:mt-6 flex items-center justify-center gap-3 py-4 lg:py-5 rounded-2xl bg-gradient-to-r from-[#D9AB36] to-[#B38B21] text-black font-black text-[12px] lg:text-[13px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(205,160,50,0.3)] hover:scale-[1.02] transition-transform"
                                >
                                    Confirm Dispatch <Send size={16} className="-mt-0.5" />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Info Cards Column */}
                    <div className="lg:col-span-5 space-y-6 lg:space-y-8 lg:sticky lg:top-32 h-fit">

                        <div className={`p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:scale-[1.02] cursor-pointer border glow-surface shadow-xl relative overflow-hidden ${isLight ? 'bg-white shadow-black/5 border-gray-200' : 'bg-[var(--bb-surface)] border-[var(--bb-border)]'}`}>
                            <div className="pointer-events-none absolute inset-0 z-0 opacity-50">
                                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 rounded-tl-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 rounded-tr-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 rounded-bl-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 rounded-br-[2rem] transition-colors border-[#B38B21]/30" />
                            </div>

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner z-10 ${isLight ? 'bg-[#F0F0F0]' : 'bg-[var(--bb-bg)]'}`}>
                                <Mail size={24} className="text-[#CDA032]" />
                            </div>
                            <div className="z-10">
                                <h3 className="font-black text-[15px] lg:text-[16px] uppercase tracking-widest mb-1 opacity-80">Email Us</h3>
                                <p className={`text-[12px] lg:text-[13px] font-medium leading-tight mb-1.5 ${isLight ? 'text-black/60' : 'text-white/50'}`}>Friendly support team.</p>
                                <p className="text-[13px] lg:text-[14px] font-black" style={{ color: '#B38B21' }}>support@blackbox.tech</p>
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:scale-[1.02] cursor-pointer border glow-surface shadow-xl relative overflow-hidden ${isLight ? 'bg-white shadow-black/5 border-gray-200' : 'bg-[var(--bb-surface)] border-[var(--bb-border)]'}`}>
                            <div className="pointer-events-none absolute inset-0 z-0 opacity-50">
                                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 rounded-tl-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 rounded-tr-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 rounded-bl-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 rounded-br-[2rem] transition-colors border-[#B38B21]/30" />
                            </div>

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner z-10 ${isLight ? 'bg-[#F0F0F0]' : 'bg-[var(--bb-bg)]'}`}>
                                <Phone size={24} className="text-[#CDA032]" />
                            </div>
                            <div className="z-10">
                                <h3 className="font-black text-[15px] lg:text-[16px] uppercase tracking-widest mb-1 opacity-80">Call Us</h3>
                                <p className={`text-[12px] lg:text-[13px] font-medium leading-tight mb-1.5 ${isLight ? 'text-black/60' : 'text-white/50'}`}>Mon-Sat 8am to 6pm.</p>
                                <p className="text-[13px] lg:text-[14px] font-black" style={{ color: '#B38B21' }}>+233 50 123 4567</p>
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:scale-[1.02] cursor-pointer border glow-surface shadow-xl relative overflow-hidden ${isLight ? 'bg-white shadow-black/5 border-gray-200' : 'bg-[var(--bb-surface)] border-[var(--bb-border)]'}`}>
                            <div className="pointer-events-none absolute inset-0 z-0 opacity-50">
                                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 rounded-tl-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 rounded-tr-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 rounded-bl-[2rem] transition-colors border-[#B38B21]/30" />
                                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 rounded-br-[2rem] transition-colors border-[#B38B21]/30" />
                            </div>

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner z-10 ${isLight ? 'bg-[#F0F0F0]' : 'bg-[var(--bb-bg)]'}`}>
                                <MapPin size={24} className="text-[#CDA032]" />
                            </div>
                            <div className="z-10">
                                <h3 className="font-black text-[15px] lg:text-[16px] uppercase tracking-widest mb-1 opacity-80">Visit Us</h3>
                                <p className={`text-[12px] lg:text-[13px] font-medium leading-tight mb-1.5 ${isLight ? 'text-black/60' : 'text-white/50'}`}>Our retail store location.</p>
                                <p className="text-[13px] lg:text-[14px] font-black" style={{ color: '#B38B21' }}>Tech Hub, KNUST, Kumasi</p>
                            </div>
                        </div>

                        {/* Guarantee card (matching Trade-in best value card aesthetic) */}
                        <div className="rounded-[2rem] p-6 space-y-3" style={{ backgroundColor: 'rgba(179,139,33,0.04)', borderLeft: '2px solid rgba(179,139,33,0.3)' }}>
                            <div className="flex items-center gap-3">
                                <MessageSquare size={18} style={{ color: '#B38B21' }} />
                                <h4 className="text-[13px] font-black uppercase tracking-wider text-white/80">Fast Response Guarantee</h4>
                            </div>
                            <p className="text-[12px] text-white/50 leading-relaxed font-semibold">
                                We prioritize your inquiries and aim to reply within 2 hours during active business hours.
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
