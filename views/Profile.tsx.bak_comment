import React, { useState } from 'react';
import {
  LogOut, Package, Wrench, Clock, CheckCircle2,
  MapPin, Mail, ChevronRight, Activity, Shield, CreditCard,
  Truck, XCircle, User as UserIcon, Settings, Heart, Sliders, HelpCircle,
  Eye, RefreshCw, Smartphone, Trash2, Download, FileText, AlertCircle, Menu, X
} from 'lucide-react';
import { User, RepairRequest, Order, Product } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { ProductCard } from '../components/ProductCard';
import { OrderTracking } from '../components/OrderTracking';

interface ProfileProps {
  user: User | null;
  repairs: RepairRequest[];
  orders: Order[];
  wishlist: string[];
  products: Product[];
  setUser: (u: User | null) => void;
  navigateTo: (v: string, id?: string) => void;
  toggleWishlist: (id: string) => void;
  onAddToCart: (p: Product) => void;
}

export const Profile: React.FC<ProfileProps> = ({
  user, repairs, orders, wishlist, products, setUser, navigateTo, toggleWishlist, onAddToCart
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'orders' | 'repairs' | 'address' | 'payment' | 'wishlist' | 'preferences'>('overview');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center border border-white/10">
          <UserIcon size={32} className="text-white/20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tight italic text-white">Access Required</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Sign in to view your repository</p>
        </div>
        <button
          onClick={() => navigateTo('auth')}
          className="px-10 py-4 bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black font-black rounded-full text-[10px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-[0_10px_40px_rgba(179,139,33,0.3)]"
        >
          Sign In
        </button>
      </div>
    </div>
  );

  const activeRepairsCount = repairs.filter(r => r.status !== 'Completed').length;
  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  const menuItems = [
    { id: 'overview', icon: Sliders, label: 'Overview' },
    { id: 'orders', icon: Package, label: 'Orders', badge: orders.length > 0 ? orders.length : null },
    { id: 'repairs', icon: Wrench, label: 'Repairs', badge: activeRepairsCount > 0 ? activeRepairsCount : null },
    { id: 'wishlist', icon: Heart, label: 'Wishlist', badge: wishlist.length > 0 ? wishlist.length : null },
    { id: 'settings', icon: UserIcon, label: 'Settings' },
    { id: 'address', icon: MapPin, label: 'Addresses' },
    { id: 'payment', icon: CreditCard, label: 'Payment' },
    { id: 'preferences', icon: Settings, label: 'Preferences' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Greeting Banner */}
            <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-xl">
              <div className="z-10 space-y-2">
                <h2 className="text-2xl md:text-3xl font-black italic tracking-tight uppercase leading-tight">
                  Welcome back, {user.name}
                </h2>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/30 italic flex items-center gap-2">
                  <CheckCircle2 size={10} className="text-green-400" />
                  Member since {formatDate(new Date().toISOString())}
                </p>
              </div>
              <div className="z-10 bg-white/5 border border-white/10 px-5 py-2 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-wider text-white/60">Verified</span>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#B38B21]/[0.05] blur-[120px] rounded-full -mr-20 -mt-20"></div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { id: 'orders', label: 'Orders', value: orders.length, sub: 'Total acquisitions', icon: Package, color: 'from-blue-500/20 to-blue-600/10' },
                { id: 'repairs', label: 'Active Repairs', value: activeRepairsCount, sub: 'In diagnostics', icon: Wrench, color: 'from-orange-500/20 to-orange-600/10' },
                { id: 'wishlist', label: 'Wishlist', value: wishlist.length, sub: 'Saved items', icon: Heart, color: 'from-red-500/20 to-red-600/10' },
              ].map((stat, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(stat.id as any)}
                  className="p-6 rounded-2xl space-y-5 relative group bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 hover:border-white/20 transition-all shadow-lg hover:shadow-2xl text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white border border-white/10 group-hover:scale-110 transition-transform`}>
                      <stat.icon size={18} />
                    </div>
                    <ChevronRight size={16} className="text-white/10 group-hover:translate-x-1 group-hover:text-white/30 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black italic tracking-tight">{stat.value}</p>
                    <p className="text-[8px] text-white/20 uppercase tracking-wider italic">{stat.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Package, label: 'Track Order', action: () => setActiveTab('orders') },
                { icon: Wrench, label: 'Book Repair', action: () => navigateTo('repair') },
                { icon: Heart, label: 'View Wishlist', action: () => setActiveTab('wishlist') },
                { icon: FileText, label: 'Invoices', action: () => { } },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={action.action}
                  className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-[#B38B21]/30 hover:bg-white/[0.05] transition-all group"
                >
                  <action.icon size={16} className="text-white/30 group-hover:text-[#B38B21] transition-colors mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-wider text-white/50 group-hover:text-white transition-colors">{action.label}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                    <Package size={20} className="text-[#B38B21]" />
                    Order History
                  </h3>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 pt-1 italic">All your acquisitions</p>
                </div>
                <button className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-[#B38B21] transition-colors flex items-center gap-2">
                  <Download size={12} />
                  Export
                </button>
              </div>
            </div>

            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[9px] font-black uppercase tracking-wider text-white/30 border-b border-white/5 bg-black/20">
                    <tr>
                      <th className="px-8 py-4">Order</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Items</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-bold">
                    {orders.map((order, i) => (
                      <tr
                        key={order.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <td className="px-8 py-5 font-black text-white">#{order.id}</td>
                        <td className="px-4 py-5 text-white/40 text-[9px]">{formatDate(order.date)}</td>
                        <td className="px-4 py-5">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${order.status === 'Delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              order.status === 'Shipped' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-white/5 text-white/40 border border-white/10'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-white/40">{order.items.length}</td>
                        <td className="px-4 py-5 text-white font-black">{formatCurrency(order.total)}</td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-white/30 hover:text-[#B38B21] transition-colors p-2 hover:bg-white/5 rounded-lg"
                            title="Track Order"
                          >
                            <Truck size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                  <Package size={24} className="text-white/20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/20">No orders yet</p>
                <button
                  onClick={() => navigateTo('store')}
                  className="mt-4 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  Start Shopping
                </button>
              </div>
            )}
          </div>
        );

        // Order Tracking Modal
        if (selectedOrder) {
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-br from-[#0a0a0a] to-[#050505] border-b border-white/10 p-6 flex items-center justify-between z-10">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                      <Truck size={20} className="text-[#B38B21]" />
                      Order Tracking
                    </h3>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Order #{selectedOrder.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <XCircle size={20} className="text-white/60" />
                  </button>
                </div>

                <div className="p-6">
                  <OrderTracking
                    order={selectedOrder}
                    onStatusUpdate={() => {
                      // Refresh orders data if needed
                    }}
                  />
                </div>
              </div>
            </div>
          );
        }

      case 'repairs':
        return (
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                    <Wrench size={20} className="text-[#B38B21]" />
                    Repair Requests
                  </h3>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 pt-1 italic">Diagnostic sessions</p>
                </div>
                <button
                  onClick={() => navigateTo('repair')}
                  className="px-5 py-2 bg-[#B38B21]/20 hover:bg-[#B38B21]/30 border border-[#B38B21]/30 rounded-full text-[9px] font-black uppercase tracking-wider text-[#B38B21] transition-all"
                >
                  New Request
                </button>
              </div>
            </div>

            {repairs.length > 0 ? (
              <div className="p-6 space-y-3">
                {repairs.map((repair, i) => (
                  <div
                    key={repair.id}
                    className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-white/20 transition-all"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 shrink-0">
                        <Smartphone size={20} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wide truncate">{repair.device}</p>
                        <p className="text-[9px] text-white/40 font-bold truncate">{repair.issue}</p>
                        <p className="text-[8px] text-white/20 font-black uppercase tracking-wider">{formatDate(repair.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-wider mb-1">Status</p>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider inline-block ${repair.status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            repair.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                          {repair.status}
                        </span>
                      </div>
                      <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-all">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                  <Wrench size={24} className="text-white/20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/20">No repair requests</p>
                <button
                  onClick={() => navigateTo('repair')}
                  className="mt-4 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  Book Repair
                </button>
              </div>
            )}
          </div>
        );

      case 'wishlist':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] p-8 border border-white/5 rounded-3xl flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                  <Heart size={20} className="text-[#B38B21]" />
                  Wishlist
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 pt-1 italic">{wishlist.length} saved items</p>
              </div>
              {wishlist.length > 0 && (
                <button className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-red-400 transition-colors flex items-center gap-2">
                  <Trash2 size={12} />
                  Clear All
                </button>
              )}
            </div>
            {wishlistedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistedProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ProductCard
                      product={p}
                      onQuickView={() => { }}
                      isWishlisted={true}
                      onToggleWishlist={toggleWishlist}
                      onAddToCart={onAddToCart}
                      isCompared={false}
                      onToggleCompare={() => { }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 rounded-3xl">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                  <Heart size={24} className="text-white/20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/20 mb-2">Your wishlist is empty</p>
                <p className="text-[9px] text-white/10 mb-4">Start adding items you love</p>
                <button
                  onClick={() => navigateTo('store')}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  Browse Store
                </button>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 rounded-3xl p-16 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
              <Settings size={24} className="text-white/20" />
            </div>
            <h3 className="text-lg font-black uppercase italic tracking-tight text-white/40 mb-2">Coming Soon</h3>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/20 italic">This section is under development</p>
          </div>
        );
    }
  };

  return (
    <div className="view-transition max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-8 min-h-[85vh] bg-black relative overflow-x-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#B38B21]/[0.02] blur-[120px] rounded-full -ml-[250px] -mt-[250px]"></div>
      </div>

      {/* Mobile Toggle Button */}
      <div className="lg:hidden flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 mb-2 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#CDA032] rounded-xl flex items-center justify-center text-black font-bold italic text-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-tight truncate">{user.name}</h4>
            <p className="text-[9px] text-[#CDA032] font-black uppercase tracking-widest">{activeTab}</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 flex items-center gap-2 transition-all border border-white/5"
        >
          <Menu size={18} />
          <span className="text-[9px] font-black uppercase tracking-widest">Repository Menu</span>
        </button>
      </div>

      {/* Sidebar Navigation - Responsive Wrapper */}
      <aside className={`
        fixed inset-0 z-[100] transition-all duration-500 lg:static lg:z-auto lg:w-[280px] shrink-0
        ${isMobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}
      `}>
        {/* Backdrop for mobile */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />

        <div className={`
          absolute right-0 top-0 h-full w-[80%] max-w-[320px] bg-gradient-to-br from-[#0a0a0a] to-[#050505] border-l border-white/10 p-5 flex flex-col shadow-2xl transition-transform duration-500
          lg:static lg:h-auto lg:w-full lg:max-w-none lg:border lg:border-white/5 lg:rounded-3xl lg:shadow-xl lg:sticky lg:top-24 lg:translate-x-0
          ${isMobileNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end mb-4">
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="p-2 bg-white/5 rounded-lg text-white/30"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="p-5 pb-6 border-b border-white/10 space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#B38B21] to-[#D4AF37] rounded-2xl flex items-center justify-center font-black text-black italic text-2xl shadow-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-base font-black italic tracking-tight uppercase leading-tight">{user.name}</h4>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider italic mt-1 truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-3 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsMobileNavOpen(false); }}
                className={`flex items-center justify-between px-5 py-3 rounded-xl transition-all group ${activeTab === item.id
                    ? 'bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black font-black shadow-lg'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} className={activeTab === item.id ? 'text-black' : 'text-white/30 group-hover:text-white/60'} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${activeTab === item.id
                      ? 'bg-black/20 text-black'
                      : 'bg-white/10 text-white/50'
                    }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-px bg-white/10 my-4"></div>

          <div className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-5 py-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">
              <HelpCircle size={16} className="text-white/30" />
              Help Center
            </button>
            <button
              onClick={() => { setUser(null); navigateTo('home'); }}
              className="flex items-center gap-3 px-5 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-[600px] relative z-10">
        {renderContent()}
      </main>
    </div>
  );
};