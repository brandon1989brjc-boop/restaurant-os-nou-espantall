'use client';

import { useOrderStore } from '@/stores/useOrderStore';

export type TabType = 'cuenta' | 'bebidas' | 'comidas' | 'reseñas' | 'voice';

interface ActionBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onOpenCart: () => void;
}

export default function ActionBar({ activeTab, onTabChange, onOpenCart }: ActionBarProps) {
    const items = useOrderStore((state) => state.items);
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
        {
            id: 'cuenta',
            label: 'Cuenta',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            id: 'bebidas',
            label: 'Bebidas',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21V10m0 0a2 2 0 100-4 2 2 0 000 4zm-8 4h16m-2 0l-1 7H7l-1-7" />
                </svg>
            )
        },
        {
            id: 'comidas',
            label: 'Comidas',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            id: 'reseñas',
            label: 'Reseñas',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            )
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pointer-events-none">
            <div className="max-w-xl mx-auto bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-2 flex items-center justify-between pointer-events-auto ring-1 ring-black/5">
                <div className="flex items-center gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`relative flex items-center justify-center w-14 h-14 rounded-[1.8rem] transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            title={tab.label}
                        >
                            {tab.icon}
                            {activeTab === tab.id && (
                                <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Separator */}
                <div className="w-[1px] h-8 bg-gray-100 mx-2"></div>

                {/* Voice and Cart Group */}
                <div className="flex items-center gap-1">
                    <button
                        id="mic-trigger"
                        onClick={() => onTabChange('voice')}
                        className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${activeTab === 'voice'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>

                    <button
                        onClick={onOpenCart}
                        className="flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full shadow-xl shadow-gray-200 hover:scale-105 active:scale-95 transition-all relative"
                    >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        {itemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                                {itemCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
