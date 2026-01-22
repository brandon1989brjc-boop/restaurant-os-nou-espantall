import { supabase } from './supabase';

export interface Review {
    id?: string;
    user_id: string;
    user_name: string;
    rating: number;
    comment: string;
    dish_id?: string; // Optional for general reviews
    dish_name?: string;
    created_at?: string;
}

export async function submitReview(review: Review): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('reviews')
            .insert([review]);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error submitting review:', err);
        return false;
    }
}

export async function getReviews(dishId?: string): Promise<Review[]> {
    try {
        let query = supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (dishId) {
            query = query.eq('dish_id', dishId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(item => ({
            ...item,
            date: new Date(item.created_at).toLocaleDateString()
        }));
    } catch (err) {
        console.error('Error fetching reviews:', err);
        return [];
    }
}
