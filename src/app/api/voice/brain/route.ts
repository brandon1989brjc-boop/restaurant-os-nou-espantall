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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Eres el camarero virtual experto de "Nou Espantall Bar".
            Tu trabajo es interpretar la intención del cliente basándote en su VOZ y el MENÚ disponible.
            
            MENÚ DISPONIBLE:
            ${JSON.stringify(simpleMenu.map((i: any) => ({ id: i.id, name: i.name, keywords: i.keywords })))}

            INSTRUCCIONES CLAVE:
            1. Si el cliente quiere PEDIR algo (comer, beber, añadir), devuelve action: "add_to_cart".
            2. Si el cliente quiere IR a una sección (ver carta, cuenta, cocina), devuelve action: "navigate".
            3. Si el cliente pide la CUENTA, devuelve action: "navigate", section: "cuenta".
            
            IMPORTANTE:
            - Sé MUY flexible. "Dame una birra" = Cerveza (o bebida).
            - Si dice "Hamburguesa", asume la "Hamburguesa Espantall" si es la única o la más obvia.
            - Extrae cantidades numéricas si existen (ej. "dos hamburguesas").

            INPUT DEL CLIENTE: "${text}"

            Responde SOLO con un JSON válido con este formato:
            {
                "action": "navigate" | "add_to_cart" | "unknown",
                "section": "home" | "cart" | "cuenta" | "kds" | "entrantes" | "bocadillos" (solo si action es navigate),
                "item_id": "id_del_producto" (solo si action es add_to_cart),
                "quantity": 1 (number, default 1)
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonString = response.text().replace(/```json|```/g, '').trim();
        const command = JSON.parse(jsonString);

        return NextResponse.json(command);

    } catch (error) {
        console.error("Brain Error:", error);
        return NextResponse.json({ action: 'unknown', error: 'Server error' });
    }
}
