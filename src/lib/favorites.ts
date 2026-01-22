import { supabase } from './supabase';

export interface Favorite {
    id?: string;
    dish_id: string;
    user_id: string;
    created_at?: string;
}

export async function toggleFavorite(dishId: string, userId: string): Promise<boolean> {
    try {
        // Check if already favorite
        const { data, error } = await supabase
            .from('favorites')
            .select()
            .eq('dish_id', dishId)
            .eq('user_id', userId)
            .single();

        if (data) {
            // Remove from favorites
            await supabase
                .from('favorites')
                .delete()
                .eq('dish_id', dishId)
                .eq('user_id', userId);
            return false;
        } else {
            // Add to favorites
            await supabase
                .from('favorites')
                .insert([{ dish_id: dishId, user_id: userId }]);
            return true;
        }
    } catch (err) {
        console.error('Error toggling favorite:', err);
        return false;
    }
}

export async function getFavorites(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('favorites')
            .select('dish_id')
            .eq('user_id', userId);

        if (error) throw error;
        return data.map(f => f.dish_id);
    } catch (err) {
        console.error('Error getting favorites:', err);
        return [];
    }
}
