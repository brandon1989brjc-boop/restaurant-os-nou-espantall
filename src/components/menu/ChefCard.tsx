'use client';

interface ChefCardProps {
    chef: {
        name: string;
        specialty: string;
        rating: number;
        description: string;
        image?: string;
    };
}

export default function ChefCard({ chef }: ChefCardProps) {
    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="px-4 py-6">
            <div className="max-w-7xl mx-auto">
                <div className="card-elevated p-6 flex flex-col md:flex-row items-start gap-6">
                    {/* Rating Badge - Top Right on Mobile, Left on Desktop */}
                    <div className="absolute top-6 right-6 md:relative md:top-0 md:right-0">
                        <div className="rating-badge text-2xl">
                            ⭐ {chef.rating.toFixed(1)}
                        </div>
                    </div>

                    {/* Chef Info */}
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            {chef.name}
                        </h3>
                        <p className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                            {chef.specialty}
                        </p>

                        {/* Stars */}
                        <div className="mb-4">
                            {renderStars(chef.rating)}
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 leading-relaxed max-w-2xl">
                            {chef.description}
                        </p>
                    </div>

                    {/* Action Icons */}
                    <div className="flex gap-2 md:flex-col">
                        <button
                            className="icon-btn"
                            aria-label="Add to favorites"
                            title="Add to favorites"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>

                        <button
                            className="icon-btn"
                            aria-label="Share"
                            title="Share"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>

                        <button
                            className="icon-btn"
                            aria-label="Delete"
                            title="Delete"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
