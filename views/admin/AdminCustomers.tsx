import React, { useState, useEffect } from 'react';
import { Users, Eye, Mail, Phone, MapPin, Calendar, DollarSign, Package, ArrowUpDown } from 'lucide-react';
import { SearchInput, EmptyState } from './adminUtils';
import { getOrders, getUsers } from '../../lib/api';
import type { Order, User } from '../../types';

export const AdminCustomers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [sortField, setSortField] = useState<keyof User>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Mock data for development
    const mockUsers: User[] = [
        {
            id: '1',
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1 (555) 123-4567',
            role: 'user',
            address: '123 Main St, New York, NY 10001',
            wishlist: ['prod1', 'prod2'],
            avatarLetter: 'J'
        },
        {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            phone: '+1 (555) 987-6543',
            role: 'user',
            address: '456 Oak Ave, Los Angeles, CA 90001',
            wishlist: ['prod3'],
            avatarLetter: 'S'
        },
        {
            id: '3',
            name: 'Mike Davis',
            email: 'mike.davis@email.com',
            phone: '+1 (555) 456-7890',
            role: 'admin',
            address: '789 Pine Rd, Chicago, IL 60001',
            wishlist: [],
            avatarLetter: 'M'
        },
        {
            id: '4',
            name: 'Emily Wilson',
            email: 'emily.w@email.com',
            phone: '+1 (555) 234-5678',
            role: 'user',
            address: '321 Elm St, Houston, TX 77001',
            wishlist: ['prod4', 'prod5'],
            avatarLetter: 'E'
        },
        {
            id: '5',
            name: 'David Brown',
            email: 'david.brown@email.com',
            phone: '+1 (555) 876-5432',
            role: 'sales',
            address: '654 Maple Dr, Phoenix, AZ 85001',
            wishlist: ['prod6'],
            avatarLetter: 'D'
        }
    ];

    useEffect(() => {
        // Use mock data for now
        setUsers(mockUsers);
        // getOrders().then(o => setOrders(o));
        setLoading(false);
    }, []);

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        const aVal = a[sortField] || '';
        const bVal = b[sortField] || '';
        const comparison = aVal.toString().localeCompare(bVal.toString());
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const handleSort = (field: keyof User) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getUserStats = (userId: string) => {
        const userOrders = orders.filter(o => o.userId === userId);
        return {
            orderCount: userOrders.length,
            totalSpent: userOrders.reduce((s, o) => s + o.total, 0),
            lastOrder: userOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date,
        };
    };

    const roleColors: Record<string, string> = { admin: '#6366f1', sales: '#B38B21', repair: '#f97316', user: '#6b7280' };

    if (selectedCustomer) {
        const stats = getUserStats(selectedCustomer.id);
        return (
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white">Customer Details</h2>
                    <button
                        onClick={() => setSelectedCustomer(null)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all"
                    >
                        Back to Customers
                    </button>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-start gap-6 mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#B38B21] to-[#D4AF37] flex items-center justify-center text-black font-black text-2xl italic">
                            {selectedCustomer.avatarLetter || selectedCustomer.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-2">{selectedCustomer.name}</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-white/70">
                                    <Mail size={16} />
                                    <span>{selectedCustomer.email}</span>
                                </div>
                                {selectedCustomer.phone && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <Phone size={16} />
                                        <span>{selectedCustomer.phone}</span>
                                    </div>
                                )}
                                {selectedCustomer.address && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <MapPin size={16} />
                                        <span>{selectedCustomer.address}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full" style={{ background: `${roleColors[selectedCustomer.role ?? 'user']}20`, color: roleColors[selectedCustomer.role ?? 'user'] }}>
                                        {selectedCustomer.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 text-white/60 mb-2">
                                <Package size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Total Orders</span>
                            </div>
                            <p className="text-2xl font-black text-white">{stats.orderCount}</p>
                        </div>
                        <div className="bg-black/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 text-white/60 mb-2">
                                <DollarSign size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Total Spent</span>
                            </div>
                            <p className="text-2xl font-black text-[#B38B21]">${stats.totalSpent.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 text-white/60 mb-2">
                                <Calendar size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Last Order</span>
                            </div>
                            <p className="text-sm font-black text-white/50">
                                {stats.lastOrder ? new Date(stats.lastOrder).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No orders'}
                            </p>
                        </div>
                    </div>

                    {selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-black text-white mb-3">Wishlist Items ({selectedCustomer.wishlist.length})</h4>
                            <div className="bg-black/30 rounded-xl p-4">
                                <div className="flex flex-wrap gap-2">
                                    {selectedCustomer.wishlist.map((itemId, index) => (
                                        <div key={index} className="px-3 py-1 bg-white/10 rounded-lg text-sm text-white/70">
                                            Product {itemId}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Customers</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all"
                    >
                        {viewMode === 'table' ? 'Grid View' : 'Table View'}
                    </button>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Total Customers</p>
                    <p className="text-2xl font-black text-[#B38B21]">{users.length}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">With Orders</p>
                    <p className="text-2xl font-black text-[#10b981]">{users.filter(u => orders.some(o => o.userId === u.id)).length}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-white">${orders.reduce((s, o) => s + o.total, 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Search and filter */}
            <div className="flex justify-between items-center">
                <p className="text-[10px] text-white/30">{filtered.length} customers</p>
                <SearchInput value={q} onChange={setQ} placeholder="Search customers..." />
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<Users size={40} />} message="No customers found" />
            ) : viewMode === 'table' ? (
                /* Table View */
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">
                                        <button
                                            onClick={() => handleSort('name')}
                                            className="flex items-center gap-2 hover:text-white transition-colors"
                                        >
                                            Name
                                            <ArrowUpDown size={14} className={sortField === 'name' ? 'text-[#B38B21]' : ''} />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">
                                        <button
                                            onClick={() => handleSort('email')}
                                            className="flex items-center gap-2 hover:text-white transition-colors"
                                        >
                                            Email
                                            <ArrowUpDown size={14} className={sortField === 'email' ? 'text-[#B38B21]' : ''} />
                                        </button>
                                    </th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Role</th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Orders</th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Spent</th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((customer) => {
                                    const stats = getUserStats(customer.id);
                                    return (
                                        <tr key={customer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B38B21] to-[#D4AF37] flex items-center justify-center text-black font-black text-xs italic">
                                                        {customer.avatarLetter || customer.name.charAt(0)}
                                                    </div>
                                                    <span className="text-white font-medium">{customer.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-white/70">{customer.email}</td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full" style={{ background: `${roleColors[customer.role ?? 'user']}20`, color: roleColors[customer.role ?? 'user'] }}>
                                                    {customer.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-white/70">{stats.orderCount}</td>
                                            <td className="p-4 text-[#B38B21] font-medium">${stats.totalSpent.toLocaleString()}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <Eye size={14} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sorted.map((customer) => {
                        const stats = getUserStats(customer.id);
                        return (
                            <div key={customer.id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black text-sm shrink-0" style={{ background: roleColors[customer.role ?? 'user'] || '#6b7280' }}>
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-white truncate">{customer.name}</p>
                                        <p className="text-[10px] text-white/30 truncate">{customer.email}</p>
                                    </div>
                                    <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full shrink-0" style={{ background: `${roleColors[customer.role ?? 'user']}20`, color: roleColors[customer.role ?? 'user'] }}>
                                        {customer.role}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-black/30 rounded-xl p-2.5 text-center">
                                        <p className="text-[8px] text-white/20 uppercase tracking-widest">Orders</p>
                                        <p className="text-sm font-black text-white">{stats.orderCount}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 text-center">
                                        <p className="text-[8px] text-white/20 uppercase tracking-widest">Spent</p>
                                        <p className="text-sm font-black text-[#B38B21]">${stats.totalSpent}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 text-center">
                                        <p className="text-[8px] text-white/20 uppercase tracking-widest">Last</p>
                                        <p className="text-[9px] font-black text-white/50">{stats.lastOrder ? new Date(stats.lastOrder).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(customer)}
                                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <Eye size={14} />
                                    View Details
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
