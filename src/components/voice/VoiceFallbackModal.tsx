'use client';

import { LocalizedMenuItem } from '@/types/menu';

interface VoiceFallbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    options: LocalizedMenuItem[];
    onSelect: (item: LocalizedMenuItem) => void;
    message?: string;
}

export default function VoiceFallbackModal({ isOpen, onClose, options, onSelect, message }: VoiceFallbackModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100">
                <div className="p-8 pb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                                ¿A qué te refieres?
                            </h2>
                            <p className="text-gray-500 mt-2 font-medium">
                                {message || 'He encontrado varias opciones similares. Selecciona la correcta:'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 pt-0 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div className="space-y-3">
                        {options.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className="w-full text-left p-5 rounded-3xl border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200 transition-all flex items-center gap-4 group"
                            >
                                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                                </div>
                                <div className="text-lg font-black text-gray-900">
                                    {item.price}€
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all active:scale-95 shadow-lg"
                    >
                        Seguir explorando
                    </button>
                </div>
            </div>
        </div>
    );
}
