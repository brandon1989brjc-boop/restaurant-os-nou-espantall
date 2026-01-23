'use client';

import { useState } from 'react';

interface DishHeroProps {
    dish: {
        name: string;
        description: string;
        image: string;
        price: number;
        rating: number;
        category: string;
    };
    onPlayVideo?: () => void;
    onOrder?: () => void;
}

export default function DishHero({ dish, onPlayVideo, onOrder }: DishHeroProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <section className="relative pt-16 pb-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Hero Dish Image */}
                    <div className="relative w-full md:w-1/2 flex justify-center">
                        <div className="relative w-80 h-80">
                            <div
                                className={`image-circular w-full h-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                    }`}
                            >
                                <img
                                    src={dish.image}
                                    alt={dish.name}
                                    className="w-full h-full object-cover"
                                    onLoad={() => setImageLoaded(true)}
                                />
                            </div>
                            {!imageLoaded && (
                                <div className="absolute inset-0 image-circular bg-gray-200 animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* Hero Content */}
                    <div className="w-full md:w-1/2 text-center md:text-left">
                        <div className="mb-4">
                            <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">
                                {dish.category}
                            </p>
                            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
                                {dish.name}
                            </h1>
                            <p className="text-lg text-gray-600 leading-relaxed max-w-md">
                                {dish.description}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            <button
                                onClick={onPlayVideo}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                <span className="font-medium">Play video</span>
                            </button>

                            <button
                                onClick={onOrder}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 rounded-xl transition-all duration-200"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-medium">Order Food</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
