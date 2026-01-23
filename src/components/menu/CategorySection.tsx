'use client';

interface Dish {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    rating?: number;
}

interface CategorySectionProps {
    title: string;
    dishes: Dish[];
    onDishClick?: (dish: Dish) => void;
}

export default function CategorySection({ title, dishes, onDishClick }: CategorySectionProps) {
    return (
        <section className="py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Section Title */}
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{title}</h2>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {dishes.map((dish) => (
                        <div
                            key={dish.id}
                            onClick={() => onDishClick?.(dish)}
                            className="card-elevated p-4 cursor-pointer group"
                        >
                            {/* Dish Image */}
                            <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-xl">
                                <img
                                    src={dish.image}
                                    alt={dish.name}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                                />
                                {dish.rating && (
                                    <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 px-2 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span>{dish.rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Dish Info */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">
                                    {dish.name}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                    {dish.description}
                                </p>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-lg font-bold text-gray-900">
                                        €{dish.price.toFixed(2)}
                                    </span>
                                    <button className="btn-primary text-sm px-4 py-2">
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {dishes.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-600">No dishes available</h3>
                        <p className="text-gray-500 mt-2">Check back later for new items</p>
                    </div>
                )}
            </div>
        </section>
    );
}
