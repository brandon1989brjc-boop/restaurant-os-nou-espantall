'use client';

import { useOrderStore, Order, OrderStatus } from '@/stores/useOrderStore';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChefHat,
    Beer,
    Clock,
    CheckCircle2,
    Play,
    Truck,
    AlertCircle,
    Activity,
    LayoutDashboard,
    UtensilsCrossed
} from 'lucide-react';

export default function DashboardKDS() {
    const { orders, updateOrderStatus, fetchOrders } = useOrderStore();
    const [activeTab, setActiveTab] = useState<'COCINA' | 'BARRA'>('COCINA');
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel('orders-sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    fetchOrders();
                }
            )
            .subscribe((status) => {
                setIsOnline(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getStatusConfig = (status: OrderStatus) => {
        switch (status) {
            case 'pending': return {
                color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
                icon: Clock,
                label: 'Pendiente'
            };
            case 'preparing': return {
                color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
                icon: Play,
                label: 'En Marcha'
            };
            case 'ready': return {
                color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
                icon: CheckCircle2,
                label: 'Listo'
            };
            default: return {
                color: 'bg-white/5 text-white/40 border-white/10',
                icon: AlertCircle,
                label: status
            };
        }
    };

    const isBarItem = (category: string) => {
        const cat = category.toLowerCase();
        return cat === 'bodega' || cat === 'drinks' || cat === 'bebidas' || cat === 'postres' || cat === 'bebida';
    };

    const filteredOrders = orders.map(order => ({
        ...order,
        items: order.items.filter(item =>
            activeTab === 'BARRA' ? isBarItem(item.category) : !isBarItem(item.category)
        )
    })).filter(order => order.items.length > 0 && order.status !== 'delivered');

    // Stats
    const stats = {
        total: filteredOrders.length,
        urgent: filteredOrders.filter(o => o.status === 'pending').length,
        preparing: filteredOrders.filter(o => o.status === 'preparing').length
    };

    return (
        <div className="min-h-screen bg-[#020202] p-6 md:p-10 font-outfit text-white selection:bg-accent selection:text-black">
            {/* Header Area */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-[72px] h-[72px] bg-white text-black rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                        <LayoutDashboard size={36} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">DYSBOAR <span className="text-accent not-italic">OS</span></h1>
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-500",
                                isOnline ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")}></span>
                                {isOnline ? 'Online' : 'Simulated'}
                            </div>
                        </div>
                        <p className="text-white/30 uppercase tracking-[0.5em] text-[10px] mt-2 font-black flex items-center gap-2">
                            <Activity size={12} /> Gestión de Comandas en Tiempo Real
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 w-full xl:w-auto">
                    {/* Summary Stats */}
                    <div className="flex gap-4 px-6 py-4 bg-white/5 rounded-3xl border border-white/10 glass">
                        <div className="text-center px-4 border-r border-white/10">
                            <span className="text-[10px] text-white/30 font-black uppercase tracking-widest block mb-1">Activos</span>
                            <span className="text-2xl font-black">{stats.total}</span>
                        </div>
                        <div className="text-center px-4">
                            <span className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest block mb-1">Pendientes</span>
                            <span className="text-2xl font-black text-amber-500">{stats.urgent}</span>
                        </div>
                    </div>

                    {/* Debug Button */}
                    <button
                        onClick={async () => {
                            const testItems = [
                                { id: 'test-1', name: 'Bocadillo Jamón (TEST)', price: 8.5, quantity: 1, category: 'Bocadillos', image: '', user: 'TEST' },
                                { id: 'test-2', name: 'Caña (TEST)', price: 2.5, quantity: 2, category: 'Bebida', image: '', user: 'TEST' }
                            ];
                            const { data, error } = await supabase
                                .from('orders')
                                .insert([{
                                    table_id: 'MESA-TEST',
                                    items: testItems,
                                    total: 13.5,
                                    status: 'pending'
                                }]);
                            if (error) console.error('Error generating test order:', error);
                            else fetchOrders();
                        }}
                        className="px-6 py-4 rounded-[1.5rem] bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center gap-2"
                    >
                        <Play size={14} /> DEBUG: Pedido
                    </button>

                    <div className="flex bg-white/5 p-2 rounded-[2rem] glass border border-white/10">
                        {(['COCINA', 'BARRA'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-12 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3",
                                    activeTab === tab
                                        ? "bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-105"
                                        : "text-white/30 hover:text-white"
                                )}
                            >
                                {tab === 'COCINA' ? <ChefHat size={16} /> : <Beer size={16} />}
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                <AnimatePresence mode="popLayout">
                    {filteredOrders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="col-span-full h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[48px]"
                        >
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 text-white/10">
                                <UtensilsCrossed size={48} />
                            </div>
                            <p className="text-2xl font-black uppercase tracking-[0.3em] italic text-white/20">Sin pedidos en {activeTab}</p>
                        </motion.div>
                    ) : (
                        filteredOrders.map((order) => {
                            const status = getStatusConfig(order.status);
                            const StatusIcon = status.icon;

                            return (
                                <motion.div
                                    layout
                                    key={order.id}
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                    className="group relative bg-[#0a0a0a] border border-white/5 rounded-[40px] overflow-hidden flex flex-col h-full hover:border-white/20 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                                >
                                    {/* Order Header */}
                                    <div className="p-8 pb-6 flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-2 block">Mesa</span>
                                            <div className="text-5xl font-black text-accent group-hover:scale-110 transition-transform origin-left duration-500">
                                                {order.tableId.replace('MESA-', '')}
                                            </div>
                                        </div>
                                        <div className={cn("flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase border tracking-wider", status.color)}>
                                            <StatusIcon size={14} className={cn(order.status === 'preparing' && "animate-spin-slow")} />
                                            {status.label}
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="px-8 flex-grow py-4">
                                        <div className="space-y-6">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex gap-5 items-center group/item">
                                                    <div className="relative">
                                                        <span className="bg-white/10 text-white font-black w-10 h-10 flex items-center justify-center rounded-2xl text-sm border border-white/5 group-hover/item:bg-white group-hover/item:text-black transition-colors duration-300">
                                                            {item.quantity}
                                                        </span>
                                                        {item.quantity > 1 && (
                                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-ping"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-lg leading-tight mb-1 group-hover/item:text-accent transition-colors">
                                                            {item.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em]">{item.category}</span>
                                                            {item.user && (
                                                                <>
                                                                    <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                                                                    <span className="text-[10px] text-accent/60 font-black uppercase italic tracking-wider">Para {item.user}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Order Footer & Actions */}
                                    <div className="mt-6 p-8 bg-white/[0.02] border-t border-white/5 flex flex-col gap-5">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-3 text-white/30 font-bold text-[10px] uppercase tracking-widest">
                                                <Clock size={12} />
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <span className="text-[9px] text-white/10 font-black uppercase tracking-widest">ID: {order.id.slice(-6)}</span>
                                        </div>

                                        <div className="flex gap-3">
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                                    className="group/btn flex-grow py-5 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center justify-center gap-3 active:scale-95"
                                                >
                                                    <Play size={16} fill="currentColor" />
                                                    Empezar
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'ready')}
                                                    className="group/btn flex-grow py-5 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all duration-500 flex items-center justify-center gap-3 active:scale-95"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    Listo
                                                </button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                                    className="group/btn flex-grow py-5 bg-white/5 text-white border border-white/10 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-500 flex items-center justify-center gap-3 active:scale-95 shadow-2xl shadow-white/0 hover:shadow-white/10"
                                                >
                                                    <Truck size={16} />
                                                    Entregar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
                .glass {
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
            `}</style>
        </div>
    );
}

