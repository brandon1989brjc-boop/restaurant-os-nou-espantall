'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useOrderStore } from '@/stores/useOrderStore';
import { useUser } from '@/hooks/useUser';
import { getFavorites, toggleFavorite } from '@/lib/favorites';

import { LocalizedMenuItem } from '@/types/menu';

interface DynamicScrollerProps {
    dishes: LocalizedMenuItem[];
    isPaused?: boolean;
    speed?: number; // 1 = normal, 2 = fast, 0.5 = slow
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
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const addItem = useOrderStore((state) => state.addItem);

    useEffect(() => {
        // Reset active index only when the category physically changes
        setActiveIndex(0);
    }, [dishes[0]?.category]);

    useEffect(() => {
        if (userId) {
            getFavorites(userId).then(setFavorites);
        }
    }, [userId]);

    const onToggleFavorite = async (dishId: string) => {
        if (!userId) return;
        const isFav = await toggleFavorite(dishId, userId);
        if (isFav) {
            setFavorites(prev => [...prev, dishId]);
        } else {
            setFavorites(prev => prev.filter(id => id !== dishId));
        }
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

    useEffect(() => {
        if (isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        const interval = 5000 / speed;
        timerRef.current = setInterval(handleNext, interval);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, speed, dishes.length, activeIndex]);

    useEffect(() => {
        if (onActiveDishChange && dishes[activeIndex]) {
            onActiveDishChange(dishes[activeIndex]);
        }

        // GSAP Animation for the transition
        if (contentRef.current) {
            const items = contentRef.current.querySelectorAll('.animate-item');
            const image = contentRef.current.querySelector('.animate-image');

            gsap.killTweensOf(items);
            gsap.killTweensOf(image);

            gsap.fromTo(
                items,
                { opacity: 0, x: 50 },
                { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
            );

            gsap.fromTo(
                image,
                { opacity: 0, scale: 0.8, rotate: -5 },
                { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'power2.out' } // Simplificado para estabilidad
            );
        }
    }, [activeIndex, dishes]);

    if (dishes.length === 0) return null;

    const currentDish = dishes[activeIndex] || dishes[0];

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[70vh] flex items-center justify-center overflow-hidden bg-white"
        >
            <div
                ref={contentRef}
                key={currentDish.id}
                className="max-w-7xl w-full px-8 flex flex-col md:flex-row items-center justify-between gap-12"
            >
                {/* Large Decorative Text (Background) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none overflow-hidden whitespace-nowrap opacity-[0.03]">
                    <span className="text-[25vw] font-black uppercase text-gray-900">
                        {currentDish.category}
                    </span>
                </div>

                {/* Left: Large Dish Image */}
                <div className="relative z-10 w-full md:w-1/2 flex justify-center items-center">
                    <div className="relative group">
                        {/* Soft Shadow behind image */}
                        <div className="absolute inset-0 bg-black/10 blur-3xl rounded-full scale-75 transform translate-y-12"></div>

                        <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] relative animate-image opacity-100">
                            <img
                                src={currentDish.image}
                                alt={currentDish.name}
                                className="w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
                                style={{ filter: 'none' }} // Forzar sin filtros extraños
                            />
                        </div>

                        {/* Price Tag Floating */}
                        <div className="absolute -top-4 -right-4 bg-gray-900 text-white w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl animate-item">
                            <span className="text-xs font-bold uppercase">Solo</span>
                            <span className="text-xl font-black">{currentDish.price}€</span>
                        </div>
                    </div>
                </div>

                {/* Right: Name and Description */}
                <div className="relative z-10 w-full md:w-1/2 flex flex-col items-start text-left">
                    <p className="animate-item text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-2">
                        Plato Seleccionado • {activeIndex + 1}/{dishes.length}
                    </p>
                    <h2 className="animate-item text-6xl md:text-8xl font-black text-gray-900 mb-6 leading-none">
                        {currentDish.name}
                    </h2>
                    <p className="animate-item text-xl text-gray-600 mb-10 max-w-md leading-relaxed">
                        {currentDish.description}
                    </p>

                    <div className="animate-item flex items-center gap-6">
                        <button
                            onClick={() => onItemClick ? onItemClick(currentDish) : addItem(currentDish)}
                            className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Añadir al Carrito
                        </button>

                        <button
                            onClick={() => onToggleFavorite(currentDish.id)}
                            className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all active:scale-90 ${favorites.includes(currentDish.id)
                                ? 'bg-red-50 border-red-200 text-red-500'
                                : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-500'
                                }`}
                            title="Favorito"
                        >
                            <svg className="w-6 h-6" fill={favorites.includes(currentDish.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => onOpenReviews?.(currentDish)}
                            className="w-16 h-16 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all active:scale-90"
                            title="Comentarios"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Manual Navigation Controls */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4">
                {dishes.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === idx ? 'w-12 bg-gray-900' : 'w-4 bg-gray-200 hover:bg-gray-300'
                            }`}
                    />
                ))}
            </div>

            {/* PREV Button */}
            <button
                onClick={handlePrev}
                className="absolute bottom-10 left-10 w-16 h-16 flex items-center justify-center group hover:scale-110 transition-transform active:scale-95"
            >
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="1"
                        fill="transparent"
                        className="text-gray-200 opacity-50 group-hover:opacity-100"
                    />
                </svg>
                <div className="flex flex-col items-center">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transform rotate-180 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-[8px] font-black text-gray-400 group-hover:text-gray-900 uppercase">PREV</span>
                </div>
            </button>

            {/* NEXT Button with Progress Ring */}
            <button
                onClick={handleNext}
                className="absolute bottom-10 right-10 w-16 h-16 flex items-center justify-center group hover:scale-110 transition-transform active:scale-95"
            >
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-gray-100"
                    />
                    <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray={175}
                        strokeDashoffset={175}
                        className="text-gray-900 transition-all duration-[5000ms] linear"
                        style={{
                            transitionDuration: isPaused ? '0ms' : `${5000 / speed}ms`,
                            strokeDashoffset: (activeIndex >= 0 && !isPaused) ? 0 : 175
                        }}
                        key={activeIndex + (isPaused ? '-paused' : '')}
                    />
                </svg>
                <div className="flex flex-col items-center">
                    <svg className="w-4 h-4 text-gray-900 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-[8px] font-black text-gray-900 uppercase">NEXT</span>
                </div>
            </button>
        </div>
    );
}
