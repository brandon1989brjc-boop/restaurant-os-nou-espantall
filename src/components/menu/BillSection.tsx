'use client';

import { useEffect, useState } from 'react';
import { useOrderStore } from '@/stores/useOrderStore';
import { AnalyticsEventType, trackEvent } from '@/lib/analytics';

export default function BillSection() {
    const { orders, tableId, fetchOrders, billing, updateBilling } = useOrderStore();
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Filter orders for this table
    const tableOrders = orders.filter(o => o.tableId === tableId && o.status !== 'cancelled');
    const totalAmount = tableOrders.reduce((acc, order) => acc + order.total, 0);

    const handlePayment = async (method: 'card' | 'cash') => {
        setIsPaymentProcessing(true);
        trackEvent({
            event_type: AnalyticsEventType.PAYMENT_INITIATED,
            metadata: { method, amount: totalAmount, table_id: tableId }
        });

        // Simulate payment
        await new Promise(resolve => setTimeout(resolve, 2000));

        updateBilling({ isPaid: true, paymentType: method });

        trackEvent({
            event_type: AnalyticsEventType.PAYMENT_SUCCESS,
            metadata: { method, amount: totalAmount, table_id: tableId }
        });

        setIsPaymentProcessing(false);
    };

    if (billing.isPaid) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
                <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-2xl shadow-green-200">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-4">¡Cuenta Pagada!</h2>
                <p className="text-gray-500 font-medium text-lg max-w-md">
                    Gracias por su visita. Esperamos verle pronto de nuevo en Nou Espantall.
                </p>
                <div className="mt-12 p-6 bg-gray-50 rounded-2xl w-full max-w-sm border border-gray-100">
                    <div className="flex justify-between text-gray-500 text-sm mb-2">
                        <span>Total Pagado</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{totalAmount.toFixed(2)}€</div>
                </div>
            </div>
        );
    }

    if (tableOrders.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center p-6 text-center opacity-50">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Sin pedidos confirmados</h3>
                <p className="text-gray-500 mt-2">Los productos en el carrito no aparecen hasta confirmar el pedido.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 pb-32 animate-in slide-in-from-bottom duration-500">
            <h2 className="text-3xl font-black text-gray-900 mb-8">Cuenta Final • {tableId}</h2>

            <div className="space-y-6 mb-12">
                {tableOrders.map(order => (
                    <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                                    Pedido {order.id.slice(0, 6)}
                                </span>
                                <div className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${order.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                    }`}>
                                    {order.status.toUpperCase()}
                                </div>
                            </div>
                            <span className="font-mono text-gray-400 text-xs">
                                {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <span className="font-bold text-gray-900 text-sm w-4 pt-0.5">{item.quantity}x</span>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                            {item.modifiers && (
                                                <p className="text-[10px] text-gray-500 uppercase">{item.modifiers.join(', ')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{(item.price * item.quantity).toFixed(2)}€</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gray-900 text-white p-8 rounded-[2rem] shadow-2xl">
                <div className="flex justify-between items-end mb-8">
                    <span className="text-gray-400 font-bold uppercase tracking-widest">Total a Pagar</span>
                    <span className="text-5xl font-black">{totalAmount.toFixed(2)}€</span>
                </div>

                {isPaymentProcessing ? (
                    <div className="w-full py-6 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handlePayment('card')}
                            className="bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold flex flex-col items-center gap-2 transition-all active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Tarjeta
                        </button>
                        <button
                            onClick={() => handlePayment('cash')}
                            className="bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold flex flex-col items-center gap-2 transition-all active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Efectivo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
