'use client';

import { useEffect, useRef, useState } from 'react';
import { useOrderStore } from '@/stores/useOrderStore';
import { useUser } from '@/hooks/useUser';
import { getFavorites, toggleFavorite } from '@/lib/favorites';
import { LocalizedMenuItem } from '@/types/menu';

interface DynamicScrollerProps {
    dishes: LocalizedMenuItem[];
    isPaused?: boolean;
    speed?: number;
    onActiveDishChange?: (dish: LocalizedMenuItem) => void;
    onOpenReviews?: (dish: LocalizedMenuItem) => void;
    onNextCategory?: () => void;
    onPrevCategory?: () => void;
    onItemClick?: (dish: LocalizedMenuItem) => void;
}

export default function DynamicScroller({
    dishes,
    isPaused = false,
    speed = 1,
    onActiveDishChange,
    onOpenReviews,
    onNextCategory,
    onPrevCategory,
    onItemClick
}: DynamicScrollerProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [favorites, setFavorites] = useState<string[]>([]);
    const userId = useUser();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const addItem = useOrderStore((state) => state.addItem);

    // Resetear índice al cambiar categoría
    useEffect(() => {
        setActiveIndex(0);
    }, [dishes[0]?.category]);

    // Cargar favoritos
    useEffect(() => {
        if (userId) {
            getFavorites(userId).then(setFavorites);
        }
    }, [userId]);

    const onToggleFavorite = async (dishId: string) => {
        if (!userId) return;
        const isFav = await toggleFavorite(dishId, userId);
        setFavorites(prev => isFav ? [...prev, dishId] : prev.filter(id => id !== dishId));
    };

    const handleNext = () => {
        if (activeIndex < dishes.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            onNextCategory?.();
        }
    };

    const handlePrev = () => {
        if (activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
        } else {
            onPrevCategory?.();
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        const interval = 5000 / speed;
        timerRef.current = setInterval(handleNext, interval);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPaused, speed, dishes.length, activeIndex]);

    // Notificar cambio de plato
    useEffect(() => {
        if (onActiveDishChange && dishes[activeIndex]) {
            onActiveDishChange(dishes[activeIndex]);
        }
    }, [activeIndex, dishes]);

    if (dishes.length === 0) return null;

    const currentDish = dishes[activeIndex] || dishes[0];

    return (
        <div className="relative w-full h-[70vh] flex items-center justify-center overflow-hidden bg-white select-none">

            {/* 1. Fondo Decorativo (Texto Gigante) */}
            {/* Ponemos z-0 para asegurar que esté al fondo */}
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-[0.04]">
                <span className="text-[20vw] font-black uppercase text-gray-900 leading-none whitespace-nowrap">
                    {currentDish.category}
                </span>
            </div>

            {/* 2. Contenido Principal */}
            {/* z-10 para estar ENCIMA del fondo */}
            <div key={currentDish.id} className="relative z-10 max-w-7xl w-full px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-right-8 duration-500">

                {/* Imagen del Plato */}
                <div className="w-full md:w-1/2 flex justify-center items-center relative">
                    <div className="relative group w-[320px] h-[320px] md:w-[500px] md:h-[500px]">

                        {/* Imagen principal - Sin filtros exóticos */}
                        <img
                            src={currentDish.image}
                            alt={currentDish.name}
                            className="w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => onItemClick ? onItemClick(currentDish) : addItem(currentDish)}
                        />

                        {/* Etiqueta de Precio */}
                        <div className="absolute top-0 right-0 md:-right-4 bg-gray-900 text-white w-20 h-20 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-white z-20">
                            <span className="text-[10px] md:text-xs font-bold uppercase text-gray-400">Solo</span>
                            <span className="text-xl md:text-2xl font-black">{currentDish.price}€</span>
                        </div>
                    </div>
                </div>

                {/* Detalles y Acciones */}
                <div className="w-full md:w-1/2 flex flex-col items-start text-left space-y-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 mb-2">
                            Recomendación del Chef
                        </p>
                        <h2 className="text-5xl md:text-7xl font-black text-gray-900 leading-[0.9] tracking-tight">
                            {currentDish.name}
                        </h2>
                    </div>

                    <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-md font-medium">
                        {currentDish.description}
                    </p>

                    <div className="flex items-center gap-4 pt-2">
                        <button
                            onClick={() => onItemClick ? onItemClick(currentDish) : addItem(currentDish)}
                            className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-3"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Añadir
                        </button>

                        <button
                            onClick={() => onToggleFavorite(currentDish.id)}
                            className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-colors ${favorites.includes(currentDish.id) ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:border-gray-900 hover:text-gray-900'}`}
                        >
                            <svg className="w-6 h-6" fill={favorites.includes(currentDish.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </button>

                        <button
                            onClick={() => onOpenReviews?.(currentDish)}
                            className="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Controles de Navegación INFERIORES */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 z-20 pointer-events-none">
                <button
                    onClick={handlePrev}
                    className="pointer-events-auto w-12 h-12 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:scale-110 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* Indicadores */}
                <div className="flex gap-2 items-center bg-white/50 backdrop-blur px-4 py-2 rounded-full pointer-events-auto">
                    {dishes.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${activeIndex === idx ? 'w-8 bg-gray-900' : 'w-2 bg-gray-300'}`}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className="pointer-events-auto w-12 h-12 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:scale-110 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}
