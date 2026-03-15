import React, { useState, useEffect } from 'react';
import { Users, Shield, Wrench, ShoppingBag, Check } from 'lucide-react';
import { SearchInput, Td, Th, TableWrapper, EmptyState } from './adminUtils';
import { getUsers, updateUserRole } from '../../lib/api';
import type { User } from '../../types';

// Roles available in the system
const ROLES = [
    { id: 'user', label: 'Customer', icon: Users, desc: 'Regular customer access', color: '#6b7280' },
    { id: 'sales', label: 'Sales', icon: ShoppingBag, desc: 'Manage orders & trade-ins', color: '#B38B21' },
    { id: 'repair', label: 'Repair Tech', icon: Wrench, desc: 'Handle repairs only', color: '#f97316' },
    { id: 'admin', label: 'Admin', icon: Shield, desc: 'Full system access', color: '#6366f1' },
] as const;

type RoleId = typeof ROLES[number]['id'];

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [q, setQ] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        getUsers().then(d => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const filtered = users.filter(u => {
        const matchQ = u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase());
        const matchR = roleFilter === 'all' || u.role === roleFilter;
        return matchQ && matchR;
    });

    const toggleRole = async (userId: string, role: RoleId) => {
        setUpdating(userId);
        try {
            await updateUserRole(userId, role);
            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        } catch (e) {
            console.error('Failed to update role:', e);
        } finally {
            setUpdating(null);
        }
    };

    const getRoleInfo = (role: string) => ROLES.find(r => r.id === role) || ROLES[0];

    return (
        <div className="space-y-5">
            {/* Role summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {ROLES.map(r => {
                    const count = users.filter(u => u.role === r.id).length;
                    return (
                        <div key={r.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <r.icon size={14} style={{ color: r.color }} />
                                <p className="text-[9px] text-white/30 uppercase tracking-widest">{r.label}</p>
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
                            {r.label}
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
                            <thead><tr>
                                <Th>User</Th><Th>Email</Th><Th>Current Role</Th><Th>Change Role</Th>
                            </tr></thead>
                            <tbody>
                                {filtered.map(u => {
                                    const roleInfo = getRoleInfo(u.role);
                                    return (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-all">
                                            <Td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-black text-xs" style={{ background: `${getRoleInfo(u.role).color}` }}>
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-black text-white">{u.name}</span>
                                                </div>
                                            </Td>
                                            <Td><span className="text-xs text-white/40">{u.email}</span></Td>
                                            <Td>
                                                <div className="flex items-center gap-2">
                                                    <roleInfo.icon size={12} style={{ color: roleInfo.color }} />
                                                    <span className="text-xs font-black capitalize" style={{ color: roleInfo.color }}>{roleInfo.label}</span>
                                                </div>
                                            </Td>
                                            <Td>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {ROLES.map(r => (
                                                        <button key={r.id} onClick={() => toggleRole(u.id, r.id)}
                                                            disabled={updating === u.id}
                                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${u.role === r.id
                                                                ? 'border-transparent text-black'
                                                                : 'border-white/10 text-white/30 hover:text-white hover:border-white/20'}`}
                                                            style={u.role === r.id ? { background: r.color } : {}}>
                                                            {u.role === r.id && <Check size={9} />}
                                                            {r.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
