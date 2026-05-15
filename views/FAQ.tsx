import React, { useState } from 'react';
import { ChevronDown, Plus, Minus, MessageCircle, Phone, Mail } from 'lucide-react';
import type { Theme } from '../App';
import { useAppContext } from '../App';
import { mailtoSupport, SUPPORT_PHONE_TEL, whatsAppUrl } from '../lib/contact';

interface FAQProps {
    theme?: Theme;
}

type FaqItem = {
    question: string;
    answer: string;
    /** Optional numbered steps (shown below `answer` when the row is open). */
    steps?: string[];
};

type FaqCategory = { category: string; items: FaqItem[] };

export const FAQ: React.FC<FAQProps> = ({ theme: themeProp }) => {
    const { theme: ctxTheme } = useAppContext();
    const theme = themeProp ?? ctxTheme;
    const isLight = theme === 'light';

    const faqs: FaqCategory[] = [
        {
            category: "Orders & Shipping",
            items: [
                {
                    question: "How long does delivery take?",
                    answer: "Delivery within Kumasi takes 1-2 business days. Nationwide delivery outside Kumasi typically takes 3-5 business days via Courier services."
                },
                {
                    question: "Can I track my order?",
                    answer: "Yes, once your order is dispatched, you will receive a tracking link in your profile's Orders page that provides real-time updates."
                },
                {
                    question: "Do you offer in-store pickup?",
                    answer: "Absolutely. During checkout, you can select 'Pickup' and retrieve your device at our KNUST campus branch at your convenience."
                }
            ]
        },
        {
            category: "Trade-ins & Repairs",
            items: [
                {
                    question: "How does the Trade-in program work?",
                    answer: "You provide details about your current device (model, condition), we give you an estimated quote, and upon physical inspection, the credit is applied instantly toward a new device purchase."
                },
                {
                    question: "What items do you repair?",
                    answer: "Our certified technicians repair a wide variety of devices, specifically focused on Apple devices (iPhones, MacBooks, iPads), premium gaming consoles, and select high-end laptops."
                },
                {
                    question: "How long do repairs usually take?",
                    answer: "Standard repairs like screen or battery replacements are usually completed within hours on the same day. Complex motherboard micro-soldering may take 1-3 business days."
                },
                {
                    question: "Do repairs come with a warranty?",
                    answer: "Yes, all our repairs are backed by a minimum 90-day warranty covering parts and labor, providing you with absolute peace of mind."
                }
            ]
        },
        {
            category: "Returns & Warranty",
            items: [
                {
                    question: "What is your return policy?",
                    answer: "We offer a 14-day hassle-free return policy for unopened/unused accessories. For open-box devices, returns are subject to a standard restocking fee."
                },
                {
                    question: "How do I return something or request a refund?",
                    answer: "Start from your account so we can match the return to your order. Eligibility, timelines, and fees follow our Returns and Refund policies (for example, many sealed items must be within 14 days of delivery).",
                    steps: [
                        "Sign in to your BlackBox account.",
                        "Open Returns from the main menu or footer, or go to History → Orders and locate the order that contains the item you want to return.",
                        "Submit a return request: select the item, choose a reason (e.g. change of mind, defective, wrong item), and add any notes or photos we ask for.",
                        "Wait for our team to review the request. If it is approved, you will receive return instructions (for example in-store drop-off at our KNUST campus branch or courier details, depending on the case).",
                        "Pack the product carefully in its original packaging when possible, include all accessories and bundled items, and include any paperwork we requested.",
                        "Complete the return as instructed. After we receive and inspect the unit, an approved refund is sent back to your original payment method where possible; timing is usually a few business days after inspection, depending on your bank or wallet.",
                        "If anything is unclear, use WhatsApp, email, or phone on this page and quote your order or return reference so we can help quickly."
                    ]
                },
                {
                    question: "Are your products authentic?",
                    answer: "100% Guaranteed. BlackBox is an elite digital hardware repository, and we strictly source original, certified devices and parts."
                }
            ]
        },
        {
            category: "Policies & Security",
            items: [
                {
                    question: "How do you protect my data?",
                    answer: "We employ military-grade encryption cycles for all transactional data. You can read our full protocol in the Privacy Manifesto."
                },
                {
                    question: "Where can I read the full terms?",
                    answer: "Detailed protocols for Privacy, Returns, and Exchanges are available under our 'Policies' section in the Home menu."
                }
            ]
        }
    ];

    const [openIndex, setOpenIndex] = useState<string | null>(null);

    const toggleFaq = (idx: string) => {
        if (openIndex === idx) setOpenIndex(null);
        else setOpenIndex(idx);
    };

    return (
        <div className={`min-h-screen pt-20 pb-24 transition-colors duration-500 ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-gradient-to-b from-[#050508] via-[#08080f] to-[#050508] text-white'}`}>
            <div className="max-w-4xl mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-16 space-y-6 reveal-on-scroll">
                    <h1 className={`text-5xl md:text-7xl font-black tracking-tighter uppercase italic ${isLight ? 'text-black' : 'text-white'}`}>
                        HELP <span className={isLight ? 'text-black/40' : 'text-white/25'}>CENTER</span>
                    </h1>
                    <div className="w-16 h-1 bg-[#CDA032] mx-auto rounded-full"></div>
                    <p className={`text-lg md:text-xl font-medium max-w-2xl mx-auto ${isLight ? 'text-black/60' : 'text-white/60'}`}>
                        Everything you need to know about our products, premium repairs, and trade-in workflows.
                    </p>
                </div>

                {/* FAQs */}
                <div className="space-y-12">
                    {faqs.map((category, catIdx) => (
                        <div key={catIdx} className={`reveal-on-scroll reveal-delay-${(catIdx % 3) + 1}`}>
                            <h2 className={`text-2xl font-bold tracking-tight mb-6 flex items-center gap-3 ${isLight ? 'text-black' : 'text-white'}`}>
                                <span className="w-2 h-2 rounded-full bg-[#CDA032]"></span>
                                {category.category}
                            </h2>

                            <div className="space-y-4">
                                {category.items.map((item, itemIdx) => {
                                    const uniqueId = `${catIdx}-${itemIdx}`;
                                    const isOpen = openIndex === uniqueId;

                                    return (
                                        <div
                                            key={itemIdx}
                                            className={`overflow-hidden rounded-2xl border transition-all duration-300 ${isOpen ? (isLight ? 'bg-white border-[#CDA032]/30 shadow-lg' : 'bg-[#111] border-[#CDA032]/30 shadow-lg shadow-[#CDA032]/5') : (isLight ? 'bg-white/50 border-black/5 hover:border-black/10' : 'bg-white/5 border-white/5 hover:border-white/10')}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleFaq(uniqueId)}
                                                className={`w-full text-left px-6 py-6 flex items-center justify-between gap-4 font-semibold text-lg ${isLight ? 'text-black' : 'text-white'}`}
                                            >
                                                <span className="leading-snug pr-4">{item.question}</span>
                                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#CDA032] text-black' : (isLight ? 'bg-black/5' : 'bg-white/10')}`}>
                                                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                                                </div>
                                            </button>

                                            <div className={`transition-all duration-300 ease-in-out px-6 overflow-y-auto ${isOpen ? 'max-h-[min(85vh,48rem)] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <p className={`leading-relaxed ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                                    {item.answer}
                                                </p>
                                                {item.steps && item.steps.length > 0 && (
                                                    <ol className={`mt-4 list-decimal space-y-3 pl-5 text-left text-sm sm:text-base ${isLight ? 'text-black/80' : 'text-white/70'}`}>
                                                        {item.steps.map((step, stepIdx) => (
                                                            <li key={stepIdx} className="leading-relaxed pl-1 marker:font-bold marker:text-[#CDA032]">
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Still Need Help CTA */}
                <div className={`mt-20 p-10 rounded-[2rem] text-center border transition-colors reveal-on-scroll reveal-delay-2 ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-[#111] border-white/5'}`}>
                    <h3 className={`text-3xl font-black uppercase italic tracking-wider mb-4 ${isLight ? 'text-black' : 'text-white'}`}>Still have questions?</h3>
                    <p className={`mb-8 ${isLight ? 'text-black/60' : 'text-white/60'}`}>Our technical experts are ready to assist you.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href={whatsAppUrl('Hi BlackBox — I have a question from your FAQ page.')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#CDA032] text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                        >
                            <MessageCircle size={16} /> WhatsApp Us
                        </a>
                        <a
                            href={mailtoSupport('BlackBox support', 'Hi BlackBox team,\n\n')}
                            className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs border transition-transform hover:scale-105 ${isLight ? 'border-black/20 text-black hover:bg-black/5' : 'border-white/20 text-white hover:bg-white/5'}`}
                        >
                            <Mail size={16} /> Email Us
                        </a>
                        <a
                            href={`tel:${SUPPORT_PHONE_TEL}`}
                            className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs border transition-transform hover:scale-105 ${isLight ? 'border-black/20 text-black hover:bg-black/5' : 'border-white/20 text-white hover:bg-white/5'}`}
                        >
                            <Phone size={16} /> Call Support
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
};
