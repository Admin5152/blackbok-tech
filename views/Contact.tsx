import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useAppContext } from '../App';
import { sendContactFormEmail } from '../lib/contactEmail';
import { mailtoSupport, SUPPORT_EMAIL, SUPPORT_PHONE_TEL, WHATSAPP_DISPLAY, whatsAppUrl } from '../lib/contact';

const inputBase = (isLight: boolean) =>
  `w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all border ${
    isLight
      ? 'bg-white text-black border-black/5 focus:border-[#CDA032]'
      : 'bg-black/30 border-white/5 text-white placeholder-white/30 focus:border-[#CDA032]'
  }`;

export const Contact: React.FC = () => {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    try {
      const result = await sendContactFormEmail({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      if (result.ok === false) {
        notify(result.error, 'error');
        return;
      }

      notify('Message sent. We will get back to you within 24 hours.', 'success');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`min-h-screen py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 transition-colors duration-500 flex flex-col items-center ${
        isLight ? 'bg-[#F9F9F9] text-black' : 'bg-gradient-to-b from-[#050508] via-[#0c0c14] to-[#050508] text-white'
      }`}
    >
      <div className="w-full max-w-[1200px]">
        {/* Header Section */}
        <div className="text-center mb-12 lg:mb-20 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-4 lg:mb-6 uppercase">
            Get In <span className="text-[#CDA032]">Touch</span>
          </h1>
          <p
            className={`text-[12px] sm:text-[13px] lg:text-[15px] font-semibold leading-relaxed px-4 ${
              isLight ? 'text-black/70' : 'text-white/80'
            }`}
          >
            Have a question about a product, repair, or trade-in? Our team of tech specialists is ready to assist you
            with premium support.
          </p>
        </div>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Left Form Card */}
          <div
            className={`lg:col-span-7 p-8 sm:p-10 rounded-[2rem] border relative ${
              isLight
                ? 'bg-gradient-to-br from-[#CDA032]/10 to-white border-black/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]'
                : 'bg-gradient-to-br from-[#CDA032]/10 to-[var(--bb-surface)] border-white/5 shadow-2xl'
            }`}
          >
            <div className="relative z-10">
              <h2 className={`text-3xl font-bold mb-2 tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>
                Send a Message
              </h2>
              <p className={`text-[13px] mb-8 ${isLight ? 'text-black/60' : 'text-white/60'}`}>
                Submit the form and we will email our team directly. We typically respond within 24 hours.
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className={`text-[11px] ml-1 font-semibold ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      className={inputBase(isLight)}
                      placeholder="Your name"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[11px] ml-1 font-semibold ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      className={inputBase(isLight)}
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[11px] ml-1 font-semibold ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                      Phone <span className="opacity-50 font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      className={inputBase(isLight)}
                      placeholder="+233..."
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[11px] ml-1 font-semibold ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                      Subject
                    </label>
                    <input
                      type="text"
                      className={inputBase(isLight)}
                      placeholder="How can we help?"
                      required
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-5">
                  <label className={`text-[11px] ml-1 font-semibold ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className={`${inputBase(isLight)} resize-none`}
                    placeholder="Tell us about your project or question..."
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-md transition-colors bg-[#CDA032] text-black hover:bg-[#B38B21] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send size={16} /> {sending ? 'Sending…' : 'Send Message'}
                </button>
                <p className={`text-center text-[11px] mt-4 ${isLight ? 'text-black/50' : 'text-white/40'}`}>
                  We typically respond within 24 hours
                </p>
              </form>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={`p-4 rounded-2xl flex items-center gap-4 ${
                isLight ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-black/5' : 'bg-[#111] border border-white/5'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  isLight ? 'bg-[#CDA032]/10 text-[#CDA032]' : 'bg-[#CDA032]/10 text-[#CDA032]'
                }`}
              >
                <Mail size={18} />
              </div>
              <div>
                <h4 className={`font-bold text-[13px] mb-0.5 ${isLight ? 'text-black' : 'text-white'}`}>Email Support</h4>
                <a href={mailtoSupport()} className={`text-[12px] hover:text-[#CDA032] ${isLight ? 'text-black/60' : 'text-white/60'}`}>
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl flex items-center gap-4 ${
                isLight ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-black/5' : 'bg-[#111] border border-white/5'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  isLight ? 'bg-[#CDA032]/10 text-[#CDA032]' : 'bg-[#CDA032]/10 text-[#CDA032]'
                }`}
              >
                <Phone size={18} />
              </div>
              <div>
                <h4 className={`font-bold text-[13px] mb-0.5 ${isLight ? 'text-black' : 'text-white'}`}>Phone / WhatsApp</h4>
                <a href={`tel:${SUPPORT_PHONE_TEL}`} className={`text-[12px] hover:text-[#CDA032] ${isLight ? 'text-black/60' : 'text-white/60'}`}>
                  {WHATSAPP_DISPLAY}
                </a>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl flex items-center gap-4 ${
                isLight ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-black/5' : 'bg-[#111] border border-white/5'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  isLight ? 'bg-[#CDA032]/10 text-[#CDA032]' : 'bg-[#CDA032]/10 text-[#CDA032]'
                }`}
              >
                <MapPin size={18} />
              </div>
              <div>
                <h4 className={`font-bold text-[13px] mb-0.5 ${isLight ? 'text-black' : 'text-white'}`}>Store Location</h4>
                <p className={`text-[12px] ${isLight ? 'text-black/60' : 'text-white/60'}`}>Tech Hub, KNUST, Kumasi</p>
              </div>
            </div>

            <div
              className={`p-6 mt-6 rounded-[1.5rem] border ${
                isLight ? 'bg-[#FCFBF8] border-[#CDA032]/20' : 'bg-[#CDA032]/5 border-[#CDA032]/20'
              }`}
            >
              <h3 className={`font-bold text-[15px] mb-4 ${isLight ? 'text-black' : 'text-white'}`}>Office Hours</h3>
              <div className={`space-y-3 text-[13px] ${isLight ? 'text-[#555]' : 'text-white/80'}`}>
                <div className="flex justify-between">
                  <span className="opacity-70">Monday - Friday</span>
                  <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Saturday</span>
                  <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Sunday</span>
                  <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>Closed</span>
                </div>
              </div>
              <div
                className={`mt-5 pt-4 border-t text-[11px] flex gap-2 ${isLight ? 'border-[#CDA032]/20' : 'border-[#CDA032]/20'}`}
              >
                <span className="font-bold text-[#CDA032]">Timezone:</span>{' '}
                <span className={isLight ? 'text-black/50' : 'text-white/50'}>GMT (Accra, Ghana)</span>
              </div>
            </div>

            <div className="p-6 mt-4 rounded-[1.5rem] shadow-lg relative overflow-hidden bg-gradient-to-r from-[#D9AB36] to-[#B38B21] text-black">
              <h3 className="font-bold text-base mb-1.5 text-black">Response Guarantee</h3>
              <p className="text-[12.5px] mb-5 opacity-90 leading-relaxed max-w-[95%] text-black">
                We respond to every message within 24 hours. For urgent matters, reach us on WhatsApp or Instagram.
              </p>

              <div className="flex gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center shadow-sm transition-colors hover:bg-black hover:text-[#CDA032] text-black"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a
                  href={whatsAppUrl('Hi BlackBox — I need help.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center shadow-sm transition-colors hover:bg-black hover:text-[#CDA032] text-black"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
