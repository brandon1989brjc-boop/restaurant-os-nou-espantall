import { createClient } from '@supabase/supabase-js';

// Variables con valores por defecto seguros
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Modo mock si la URL contiene 'mock' o 'placeholder'
export const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ||
    supabaseUrl.includes('mock') ||
    supabaseUrl.includes('placeholder');

// Crear cliente con configuración segura
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: !isMockMode,
        autoRefreshToken: !isMockMode,
    }
});

if (isMockMode) {
    console.log('🔧 Supabase running in MOCK MODE - using local data only');
}
