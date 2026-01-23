'use client';

import { useEffect, useState, useRef } from 'react';
import { useOrderStore, Order } from '@/stores/useOrderStore';
import { useSound } from '@/hooks/useSound';

export default function KDSPage() {
    const { orders, fetchOrders, updateOrderStatus } = useOrderStore();
    const [currentTime, setCurrentTime] = useState(new Date());
    const prevOrdersCount = useRef(0);
    const playSound = useSound();

    useEffect(() => {
        // Initial fetch
        fetchOrders();

        // Polling for new orders every 5s
        const interval = setInterval(() => {
            fetchOrders();
            setCurrentTime(new Date());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Filter out completed/cancelled orders for the active view
    const activeOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status));

    // Play sound on new orders
    useEffect(() => {
        if (activeOrders.length > prevOrdersCount.current) {
            playSound();
        }
        prevOrdersCount.current = activeOrders.length;
    }, [activeOrders.length, playSound]);

    const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'pending' ? 'preparing' : 'ready';
        await updateOrderStatus(orderId, newStatus);
    };

    const getElapsedTime = (date: Date) => {
        const diff = Math.floor((currentTime.getTime() - new Date(date).getTime()) / 1000 / 60);
        return `${diff} min`;
    };

    return (
        <div className="min-h-screen bg-black text-white font-mono p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-4">
                <h1 className="text-4xl font-bold tracking-tighter">KITCHEN OS v1.0</h1>
                <div className="text-right">
                    <div className="text-2xl font-bold">{currentTime.toLocaleTimeString()}</div>
                    <div className="text-sm text-gray-400">PENDING: {activeOrders.length}</div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeOrders.map(order => (
                    <div
                        key={order.id}
                        className={`border-4 rounded-xl p-4 flex flex-col justify-between transition-colors ${order.status === 'preparing'
                            ? 'border-yellow-400 bg-yellow-900/20'
                            : 'border-white bg-gray-900'
                            }`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-2">
                                <div>
                                    <span className="text-3xl font-black block">#{order.tableId}</span>
                                    <span className="text-xs text-gray-400">ID: {order.id.slice(0, 5)}</span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xl font-bold block ${parseInt(getElapsedTime(order.createdAt)) > 15 ? 'text-red-500 animate-pulse' : 'text-green-400'
                                        }`}>
                                        {getElapsedTime(order.createdAt)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 text-lg">
                                        <span className="font-bold w-6">{item.quantity}</span>
                                        <div className="flex-1">
                                            <span className={item.modifiers ? 'font-bold' : ''}>{item.name}</span>
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="text-yellow-300 text-sm mt-1 uppercase">
                                                    {item.modifiers.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => handleStatusUpdate(order.id, order.status)}
                            className={`w-full mt-6 py-4 text-xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all ${order.status === 'preparing'
                                ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                : 'bg-white text-black'
                                }`}
                        >
                            {order.status === 'pending' ? 'START COOKING' : 'MARK READY'}
                        </button>
                    </div>
                ))}

                {activeOrders.length === 0 && (
                    <div className="col-span-full h-96 flex items-center justify-center text-gray-600 text-2xl font-bold uppercase tracking-widest border-2 border-dashed border-gray-800 rounded-xl">
                        No active orders
                    </div>
                )}
            </div>
        </div>
    );
}
