import { createClient } from '@supabase/supabase-js';

// Variables para el entorno de pruebas (aislamiento total)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_TEST || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Crear cliente para el entorno de pruebas
export const supabaseTest = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: true,
    }
});

/**
 * Nota: El uso de supabaseTest garantiza que las operaciones de la IA 
 * (Vapi/Groq) durante las pruebas no afecten a la base de datos principal.
 */
