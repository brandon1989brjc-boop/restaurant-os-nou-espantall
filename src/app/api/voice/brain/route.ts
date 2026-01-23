import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import menuData from '@/lib/menu.json';

// FALLBACK: Si no hay API Key, usamos una lógica básica pero segura
function localFallbackBrain(text: string, items: any[]) {
    const lower = text.toLowerCase();

    // 1. Navegación explícita
    if (lower.includes('ir a') || lower.includes('ver')) {
        if (lower.includes('cuenta')) return { action: 'navigate', section: 'cuenta' };
        if (lower.includes('inicio')) return { action: 'navigate', section: 'home' };
        if (lower.includes('carrito')) return { action: 'navigate', section: 'cart' };
    }

    // 2. Búsqueda de producto simple
    for (const item of items) {
        if (lower.includes(item.name.es.toLowerCase())) {
            return {
                action: 'add_to_cart',
                item_id: item.id,
                quantity: lower.includes('dos') || lower.includes('2') ? 2 : 1
            };
        }
    }

    return { action: 'unknown', reason: 'Fallback logic no entendió' };
}

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // Aplanar el menú para que la IA lo entienda fácil
        const data: any = menuData;

        const simpleMenu = data.categories.flatMap((cat: any) =>
            cat.items.map((item: any) => ({
                id: item.id,
                name: item.name.es,
                category: cat.name.es,
                keywords: item.keywords || [],
                description: item.description.es
            }))
        ).concat([
            {
                id: data.featuredDish.id,
                name: data.featuredDish.name.es,
                category: 'Especialidad',
                keywords: data.featuredDish.keywords || [],
                description: data.featuredDish.description.es
            }
        ]);

        if (!apiKey) {
            console.warn("⚠️ No GEMINI_API_KEY found. Using fallback.");
            return NextResponse.json(localFallbackBrain(text, simpleMenu));
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Estrategia Multi-Modelo: Intentar el más rápido, si falla, usar el más estable
        let model;
        let result;

        const modelsToTry = ["gemini-1.5-flash", "gemini-pro"];
        let lastError;

        for (const modelName of modelsToTry) {
            try {
                model = genAI.getGenerativeModel({ model: modelName });

                const prompt = `
                    Eres el camarero virtual experto de "Nou Espantall Bar".
                    Tu trabajo es interpretar la intención del cliente basándote en su VOZ y el MENÚ disponible.
                    
                    MENÚ DISPONIBLE APLANADO:
                    ${JSON.stringify(simpleMenu.map((i: any) => ({ id: i.id, name: i.name, keywords: i.keywords })))}
        
                    INSTRUCCIONES CLAVE:
                    1. Si el cliente quiere PEDIR algo (comer, beber, añadir), devuelve action: "add_to_cart".
                    2. Si el cliente quiere IR a una sección (ver carta, cuenta, cocina), devuelve action: "navigate".
                    3. Si el cliente pide la CUENTA, devuelve action: "navigate", section: "cuenta".
                    
                    IMPORTANTE:
                    - Sé MUY flexible. "Dame una birra" = Cerveza (o bebida).
                    - Asume el plato más probable si es ambiguo.
                    - Extrae cantidades numéricas si existen (ej. "dos hamburguesas").
        
                    INPUT DEL CLIENTE: "${text}"
        
                    Responde SOLO con un JSON válido con este formato:
                    {
                        "action": "navigate" | "add_to_cart" | "unknown",
                        "section": "home" | "cart" | "cuenta" | "kds" | "entrantes" | "bocadillos",
                        "item_id": "id_del_producto",
                        "quantity": 1
                    }
                `;

                result = await model.generateContent(prompt);
                break; // Si funciona, salimos del bucle
            } catch (e) {
                console.warn(`Fallo con modelo ${modelName}, intentando siguiente...`, e);
                lastError = e;
                continue; // Si falla, probamos el siguiente
            }
        }

        if (!result) throw lastError || new Error("Todos los modelos fallaron");
        const response = await result.response;
        const jsonString = response.text().replace(/```json|```/g, '').trim();
        const command = JSON.parse(jsonString);

        return NextResponse.json(command);

    } catch (error: any) {
        console.error("Brain Error:", error);
        // Devolvemos el error detallado para que el panel de debug (y el usuario técnico) sepa qué pasa
        return NextResponse.json({
            action: 'error',
            error: error.message || 'Error desconocido en servidor',
            details: JSON.stringify(error)
        }, { status: 500 });
    }
}
