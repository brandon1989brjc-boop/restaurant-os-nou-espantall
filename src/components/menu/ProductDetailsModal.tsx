'use client';

import { useState, useEffect } from 'react';
import { LocalizedMenuItem, LocalizedModifierGroup } from '@/types/menu';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface ProductDetailsModalProps {
    item: LocalizedMenuItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: LocalizedMenuItem, quantity: number, selectedModifiers: string[]) => void;
}

export default function ProductDetailsModal({ item, isOpen, onClose, onAddToCart }: ProductDetailsModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
    const { language } = useLanguageStore();

    // Reset state when item changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelectedModifiers({});
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleModifierToggle = (group: LocalizedModifierGroup, optionId: string) => {
        setSelectedModifiers(prev => {
            const current = prev[group.id] || [];
            const isSelected = current.includes(optionId);

            if (group.maxSelection === 1) {
                // Radio logic: replace entire array with new selection
                return { ...prev, [group.id]: [optionId] };
            } else {
                // Checkbox logic
                if (isSelected) {
                    return { ...prev, [group.id]: current.filter(id => id !== optionId) };
                } else {
                    if (current.length < group.maxSelection) {
                        return { ...prev, [group.id]: [...current, optionId] };
                    }
                    return prev;
                }
            }
        });
    };

    const calculateTotal = () => {
        let total = item.price;
        item.modifierGroups?.forEach(group => {
            const selectedIds = selectedModifiers[group.id] || [];
            selectedIds.forEach(optId => {
                const opt = group.options.find(o => o.id === optId);
                if (opt) total += opt.priceDelta;
            });
        });
        return total * quantity;
    };

    const isValid = () => {
        if (!item.modifierGroups) return true;
        return item.modifierGroups.every(group => {
            const count = (selectedModifiers[group.id] || []).length;
            return count >= group.minSelection;
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Imagen Cabecera */}
                <div className="relative h-48 sm:h-56 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{item.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">{item.description}</p>
                    </div>

                    {item.modifierGroups?.map(group => (
                        <div key={group.id} className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white">{group.name}</h3>
                                <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500">
                                    {group.minSelection === 1 && group.maxSelection === 1
                                        ? (language === 'es' ? 'Elige 1' : 'Choose 1')
                                        : (language === 'es' ? `Máx ${group.maxSelection}` : `Max ${group.maxSelection}`)}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {group.options.map(opt => {
                                    const isSelected = (selectedModifiers[group.id] || []).includes(opt.id);
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => handleModifierToggle(group, opt.id)}
                                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${isSelected
                                                    ? 'border-black dark:border-white bg-gray-50 dark:bg-white/5'
                                                    : 'border-transparent bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span className="font-medium text-sm text-gray-900 dark:text-gray-200">{opt.name}</span>
                                            <div className="flex items-center gap-3">
                                                {opt.priceDelta > 0 && (
                                                    <span className="text-xs font-bold text-gray-500">+{opt.priceDelta.toFixed(2)}€</span>
                                                )}
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-black dark:border-white bg-black dark:bg-white' : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white dark:bg-black" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pb-8 sm:pb-4 shrink-0">
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-xl px-2 h-14">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-full flex items-center justify-center text-xl font-bold text-gray-500 hover:text-black">-</button>
                            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-full flex items-center justify-center text-xl font-bold text-gray-500 hover:text-black">+</button>
                        </div>
                        <button
                            onClick={() => {
                                // Flatten modifiers for simplified cart logic
                                const allModifiers = Object.values(selectedModifiers).flat();
                                onAddToCart(item, quantity, allModifiers);
                            }}
                            disabled={!isValid()}
                            className={`flex-1 h-14 rounded-xl flex items-center justify-between px-6 font-bold text-white transition-all ${isValid() ? 'bg-black dark:bg-white dark:text-black shadow-lg hover:scale-[1.02]' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                        >
                            <span>{language === 'es' ? 'Añadir' : 'Add to Order'}</span>
                            <span>{calculateTotal().toFixed(2)}€</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
