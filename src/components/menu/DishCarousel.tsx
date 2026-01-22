'use client';

import { useRef, useState } from 'react';

interface Dish {
    id: string;
    name: string;
    image: string;
    price: number;
    category: string;
}

interface DishCarouselProps {
    dishes: Dish[];
    onDishClick?: (dish: Dish) => void;
}

export default function DishCarousel({ dishes, onDishClick }: DishCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;

        const scrollAmount = 300;
        const newScrollLeft = scrollContainerRef.current.scrollLeft +
            (direction === 'right' ? scrollAmount : -scrollAmount);

        scrollContainerRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });
    };

    const checkScroll = () => {
        if (!scrollContainerRef.current) return;

        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    return (
        <div className="relative py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Scroll Left Button */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 icon-btn shadow-md"
                        aria-label="Scroll left"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Carousel Container */}
                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex gap-6 overflow-x-auto custom-scrollbar pb-4 px-12 md:px-16"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {dishes.map((dish) => (
                        <div
                            key={dish.id}
                            onClick={() => onDishClick?.(dish)}
                            className="flex-shrink-0 cursor-pointer group"
                        >
                            <div className="flex flex-col items-center gap-2">
                                {/* Circular Thumbnail */}
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-gray-400 transition-all duration-200 group-hover:shadow-md">
                                    <img
                                        src={dish.image}
                                        alt={dish.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                {/* Dish Name */}
                                <p className="text-xs md:text-sm font-medium text-gray-700 text-center max-w-[80px] md:max-w-[100px] line-clamp-2">
                                    {dish.name}
                                </p>
                                {/* Price */}
                                <p className="text-xs text-gray-500">
                                    €{dish.price.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scroll Right Button */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 icon-btn shadow-md"
                        aria-label="Scroll right"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
