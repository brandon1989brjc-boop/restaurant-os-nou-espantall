'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { getReviews, submitReview, Review as SupabaseReview } from '@/lib/reviews';

interface Review {
    id: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    date: string;
    dishName?: string;
}

interface ReviewsSectionProps {
    initialReviews?: Review[];
    dishId?: string;
    dishName?: string;
}

export default function ReviewsSection({ initialReviews = [], dishId, dishName }: ReviewsSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReview, setNewReview] = useState({
        userName: '',
        rating: 5,
        comment: ''
    });
    const userId = useUser();

    useEffect(() => {
        loadReviews();
    }, [dishId]);

    const loadReviews = async () => {
        const fetchedReviews = await getReviews(dishId);
        const formatted = fetchedReviews.map((r: any) => ({
            id: r.id,
            userName: r.user_name,
            rating: r.rating,
            comment: r.comment,
            date: new Date(r.created_at).toLocaleDateString(),
            dishName: r.dish_name
        }));
        setReviews([...formatted]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !newReview.userName || !newReview.comment) return;

        setIsSubmitting(true);
        const success = await submitReview({
            user_id: userId,
            user_name: newReview.userName,
            rating: newReview.rating,
            comment: newReview.comment,
            dish_id: dishId,
            dish_name: dishName
        });

        if (success) {
            setNewReview({ userName: '', rating: 5, comment: '' });
            setIsFormOpen(false);
            loadReviews();
        }
        setIsSubmitting(false);
    };

    const renderStars = (rating: number, interactive = false) => {
        return (
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                    <button
                        key={i}
                        type={interactive ? "button" : "submit"}
                        disabled={!interactive}
                        onClick={() => interactive && setNewReview(prev => ({ ...prev, rating: i + 1 }))}
                        className={`transition-all ${interactive ? 'hover:scale-125 active:scale-95 cursor-pointer' : ''}`}
                    >
                        <svg
                            className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <section className="py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Comentarios</h2>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
                            {dishName ? `Opiniones sobre ${dishName}` : 'Lo que dicen nuestros clientes'}
                        </p>
                    </div>
                    {!isFormOpen && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
                        >
                            Dejar Comentario
                        </button>
                    )}
                </div>

                {/* New Review Form */}
                {isFormOpen && (
                    <div className="mb-12 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 animate-in slide-in-from-top-4 duration-500">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Tu Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={newReview.userName}
                                        onChange={(e) => setNewReview(prev => ({ ...prev, userName: e.target.value }))}
                                        className="w-full bg-white border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-gray-900 transition-all font-bold text-gray-900"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Tu Valoración</label>
                                    <div className="bg-white px-6 py-4 rounded-2xl flex items-center h-[56px]">
                                        {renderStars(newReview.rating, true)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Tu Opinión</label>
                                <textarea
                                    required
                                    value={newReview.comment}
                                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                                    className="w-full bg-white border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-gray-900 transition-all font-bold text-gray-900 min-h-[120px]"
                                    placeholder="Cuéntanos tu experiencia..."
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Publicar Comentario'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-8 py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-600 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start gap-6">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                                    <span className="text-gray-900 font-black text-xl">
                                        {review.userName.charAt(0).toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-black text-gray-900 text-lg leading-none">{review.userName}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-2">{review.date}</p>
                                        </div>
                                        {renderStars(review.rating)}
                                    </div>

                                    {review.dishName && (
                                        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                            Plato: {review.dishName}
                                        </div>
                                    )}

                                    <p className="text-gray-600 font-medium leading-relaxed">{review.comment}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {reviews.length === 0 && !isSubmitting && (
                        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                            <div className="text-gray-300 mb-6">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Sin comentarios aún</h3>
                            <p className="text-gray-400 mt-2 font-medium">¡Sé el primero en compartir tu experiencia!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
