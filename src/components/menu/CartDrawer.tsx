'use client';

import { useState } from 'react';
import { useOrderStore, OrderItem } from '@/stores/useOrderStore';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { items, removeItem, updateQuantity, total, clearCart, placeOrder } = useOrderStore();
    const [isOrdered, setIsOrdered] = useState(false);

    const handleConfirmOrder = async () => {
        try {
            await placeOrder();
            setIsOrdered(true);
            // Small delay to let the animation play before closing
            setTimeout(() => {
                onClose();
                setIsOrdered(false);
            }, 3000);
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    };

    if (!isOpen) return null;

    // Group items by user
    const groupedItems = items.reduce((acc, item) => {
        const user = item.user || 'General';
        if (!acc[user]) acc[user] = [];
        acc[user].push(item);
        return acc;
    }, {} as Record<string, OrderItem[]>);

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Tu Pedido</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Mesa compartida • {items.length} productos
                        </p>
                    </div>
                    <button onClick={onClose} className="icon-btn">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {isOrdered ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-100 animate-bounce">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Pedido Confirmado!</h3>
                                <p className="text-gray-500 font-medium max-w-xs">
                                    Estamos marchando tu comanda. En unos minutos estará en tu mesa.
                                </p>
                            </div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <p className="font-bold text-gray-900">Tu carrito está vacío</p>
                        </div>
                    ) : (
                        Object.entries(groupedItems).map(([user, userItems]) => (
                            <div key={user} className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gray-100"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                        Comanda de {user}
                                    </span>
                                    <div className="h-px flex-1 bg-gray-100"></div>
                                </div>

                                {userItems.map((item) => (
                                    <div key={`${item.id}-${user}`} className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                                            <p className="text-xs text-gray-500">{item.price}€</p>

                                            {/* Modificaciones/Notas */}
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                                                    {item.modifiers.map((mod, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-100"
                                                        >
                                                            {mod}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.user, item.quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-all"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.user, item.quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id, item.user)}
                                                    className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase ml-auto"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && !isOrdered && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 gap-4 flex flex-col">
                        <div className="flex justify-between items-center text-xl font-black text-gray-900">
                            <span>Total Mesa</span>
                            <span>{total.toFixed(2)}€</span>
                        </div>
                        <button
                            onClick={handleConfirmOrder}
                            className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            Confirmar Pedido
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
