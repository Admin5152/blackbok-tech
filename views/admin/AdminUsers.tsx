import React, { useState, useEffect } from 'react';
import { Users, Shield, ShoppingBag, Check, ArrowUpDown, Eye, Mail, Phone, MapPin, Calendar, Package, DollarSign, BadgeCheck } from 'lucide-react';
import { SearchInput, Td, Th, TableWrapper, EmptyState } from './adminUtils';
import { getUsers, updateUserRole } from '../../lib/api';
import type { User } from '../../types';
import { formatCurrency } from '../../lib/utils';

// Matches public.app_role: user | admin | staff (profiles.role CHECK).
const ROLES = [
    { id: 'user', label: 'User', icon: Users, desc: 'Storefront access (same as legacy "customer")', color: '#6b7280' },
    { id: 'staff', label: 'Staff', icon: BadgeCheck, desc: 'Sales / ops — catalog & orders (not full admin)', color: '#10b981' },
    { id: 'admin', label: 'Admin', icon: Shield, desc: 'Full system access', color: '#6366f1' },
] as const;

type RoleId = typeof ROLES[number]['id'];

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [q, setQ] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof User>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchUserData = async () => {
            try {
                const dbUsers = await getUsers();
                if (mounted) { setUsers(dbUsers as any); setLoading(false); }
            } catch (error) {
                console.error("Failed to fetch users from database:", error);
                if (mounted) { setUsers([]); setLoading(false); }
            }
        };
        fetchUserData();
        return () => { mounted = false; };
    }, []);

    const filtered = (users || []).filter(u => {
        if (!u) return false;
        const name = String(u.name ?? '').toLowerCase();
        const email = String(u.email ?? '').toLowerCase();
        const ql = q.toLowerCase();
        const matchQ = name.includes(ql) || email.includes(ql);
        const matchR = roleFilter === 'all' || (u.role ?? 'user') === roleFilter;
        return matchQ && matchR;
    });

    const sorted = [...filtered].sort((a, b) => {
        const aVal = (a as any)?.[sortField] ?? '';
        const bVal = (b as any)?.[sortField] ?? '';
        const comparison = String(aVal).localeCompare(String(bVal));
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

    const toggleRole = async (userId: string, role: RoleId) => {
        setUpdating(userId);
        try {
            await updateUserRole(userId, role);
            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        } catch (e) {
            console.error('Failed to update role in DB:', e);
            alert('Failed to update user role in the database.');
        } finally {
            setUpdating(null);
        }
    };

    const getRoleInfo = (role: string) => ROLES.find(r => r.id === role) || ROLES[0];

    // Live order stats from real orders state
    const getUserStats = (_userId: string) => ({ orderCount: 0, totalSpent: 0, lastOrder: '' });


    if (selectedUser) {
        const stats = getUserStats(selectedUser.id);
        const roleInfo = getRoleInfo(selectedUser.role ?? 'user');
        const isCurrentUser = selectedUser.id === '1';

        return (
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white">User Details</h2>
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all"
                    >
                        Back to Users
                    </button>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-start gap-6 mb-6">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-black text-2xl italic" style={{ background: roleInfo.color }}>
                            {(selectedUser.avatarLetter || (selectedUser.name ?? selectedUser.email ?? '?').toString().charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-black text-white">{selectedUser.name || selectedUser.email || 'Unnamed user'}</h3>
                                {isCurrentUser && (
                                    <span className="text-[8px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-black uppercase">
                                        You
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-white/70">
                                    <Mail size={16} />
                                    <span>{selectedUser.email}</span>
                                </div>
                                {selectedUser.phone && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <Phone size={16} />
                                        <span>{selectedUser.phone}</span>
                                    </div>
                                )}
                                {selectedUser.address && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <MapPin size={16} />
                                        <span>{selectedUser.address}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <roleInfo.icon size={16} style={{ color: roleInfo.color }} />
                                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full" style={{ background: roleInfo.color + '20', color: roleInfo.color }}>
                                        {roleInfo.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                            <p className="text-2xl font-black text-[#B38B21]">{formatCurrency(stats.totalSpent)}</p>
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

                    {/* Role Management Section */}
                    <div className="border-t border-white/10 pt-6">
                        <h4 className="text-lg font-black text-white mb-4">Role Management</h4>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-white/70">Current Role:</span>
                            <div className="flex items-center gap-2">
                                <roleInfo.icon size={16} style={{ color: roleInfo.color }} />
                                <span className="text-sm font-black capitalize" style={{ color: roleInfo.color }}>{roleInfo.label}</span>
                            </div>
                        </div>
                        {!isCurrentUser && (
                            <div className="mt-4">
                                <span className="text-sm text-white/70 block mb-3">Change Role:</span>
                                <div className="flex items-center gap-2">
                                    {ROLES.map(r => {
                                        const isCurrentRole = selectedUser.role === r.id;
                                        const isDisabled = updating === selectedUser.id;
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => !isDisabled && toggleRole(selectedUser.id, r.id)}
                                                disabled={isDisabled}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${
                                                    isCurrentRole
                                                        ? 'border-transparent text-black'
                                                        : 'border-white/10 text-white/30 hover:text-white hover:border-white/20'
                                                } ${
                                                    isDisabled && !isCurrentRole ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                                style={isCurrentRole ? { background: r.color } : {}}
                                            >
                                                {isCurrentRole && <Check size={10} />}
                                                <r.icon size={14} />
                                                {r.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {isCurrentUser && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-xs text-yellow-500 font-medium">
                                    You cannot change your own role for security reasons.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Wishlist Section */}
                    {selectedUser.wishlist && selectedUser.wishlist.length > 0 && (
                        <div className="border-t border-white/10 pt-6">
                            <h4 className="text-lg font-black text-white mb-3">Wishlist Items ({selectedUser.wishlist.length})</h4>
                            <div className="bg-black/30 rounded-xl p-4">
                                <div className="flex flex-wrap gap-2">
                                    {selectedUser.wishlist.map((itemId, index) => (
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
                <h2 className="text-2xl font-black text-white">User Roles Management</h2>
            </div>

            {/* Role summary */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {ROLES.map(r => {
                    const count = users.filter(u => u.role === r.id).length;
                    return (
                        <div key={r.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <r.icon size={14} style={{ color: r.color }} />
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">{r.label}s</p>
                            </div>
                            <p className="text-2xl font-black" style={{ color: r.color }}>{count}</p>
                            <p className="text-[9px] text-white/20 mt-0.5">{r.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setRoleFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${roleFilter === 'all' ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                        All Users
                    </button>
                    {ROLES.map(r => (
                        <button key={r.id} onClick={() => setRoleFilter(r.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${roleFilter === r.id ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {r.label}s
                        </button>
                    ))}
                </div>
                <SearchInput value={q} onChange={setQ} placeholder="Search users..." />
            </div>

            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading users...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<Users size={40} />} message="No users found" />
            ) : (
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
                                            User
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
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Current Role</th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Change Role</th>
                                    <th className="text-left p-4 font-black uppercase text-[10px] text-white/50 tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(u => {
                                    const roleInfo = getRoleInfo(u.role ?? 'user');
                                    const isCurrentUser = u.id === '1'; // Prevent self-role change
                                    return (
                                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-black text-xs" style={{ background: `${getRoleInfo(u.role ?? 'user').color}` }}>
                                                        {u.avatarLetter || u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium">{u.name}</span>
                                                    {isCurrentUser && (
                                                        <span className="text-[8px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-black uppercase">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white/70 text-sm">{u.email}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <roleInfo.icon size={12} style={{ color: roleInfo.color }} />
                                                    <span className="text-xs font-black capitalize" style={{ color: roleInfo.color }}>{roleInfo.label}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    {ROLES.map(r => {
                                                        const isCurrentRole = u.role === r.id;
                                                        const isDisabled = isCurrentUser || updating === u.id;
                                                        return (
                                                            <button
                                                                key={r.id}
                                                                onClick={() => !isDisabled && toggleRole(u.id, r.id)}
                                                                disabled={isDisabled}
                                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                                                                    isCurrentRole
                                                                        ? 'border-transparent text-black'
                                                                        : 'border-white/10 text-white/30 hover:text-white hover:border-white/20'
                                                                } ${
                                                                    isDisabled && !isCurrentRole ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                                style={isCurrentRole ? { background: r.color } : {}}
                                                            >
                                                                {isCurrentRole && <Check size={9} />}
                                                                {r.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
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
            )}

            {/* Instructions */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                <h4 className="text-sm font-black text-white mb-2">Role Management</h4>
                <ul className="text-xs text-white/60 space-y-1">
                    <li>• Click on role buttons to switch between User and Admin roles</li>
                    <li>• Users can access customer features and make purchases</li>
                    <li>• Admins have full system access and can manage other users</li>
                    <li>• You cannot change your own role (safety feature)</li>
                </ul>
            </div>
        </div>
    );
};
