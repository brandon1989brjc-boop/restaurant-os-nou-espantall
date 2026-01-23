import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
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
        const apiKey = process.env.GROQ_API_KEY;

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
            console.warn("⚠️ No GROQ_API_KEY found. Using fallback.");
            return NextResponse.json(localFallbackBrain(text, simpleMenu));
        }

        const groq = new Groq({ apiKey });

        // Estrategia Multi-Modelo: Llama 3.1 (rápido) -> Mixtral (robusto)
        const modelsToTry = [
            "llama-3.1-70b-versatile",  // Súper rápido y potente
            "mixtral-8x7b-32768"        // Backup robusto
        ];

        let lastError;
        let command;

        for (const modelName of modelsToTry) {
            try {
                const systemPrompt = `Eres el camarero virtual experto de "Nou Espantall Bar".
Tu trabajo es interpretar la intención del cliente basándote en su VOZ y el MENÚ disponible.

MENÚ DISPONIBLE:
${JSON.stringify(simpleMenu.map((i: any) => ({ id: i.id, name: i.name, keywords: i.keywords })))}

INSTRUCCIONES CLAVE:
1. Si el cliente quiere PEDIR algo (comer, beber, añadir), devuelve action: "add_to_cart".
2. Si el cliente quiere IR a una sección (ver carta, cuenta, cocina), devuelve action: "navigate".
3. Si el cliente pide la CUENTA, devuelve action: "navigate", section: "cuenta".

IMPORTANTE:
- Sé MUY flexible. "Dame una birra" = Cerveza (o bebida).
- Asume el plato más probable si es ambiguo.
- Extrae cantidades numéricas si existen (ej. "dos hamburguesas").

Responde SOLO con un JSON válido con este formato (sin markdown, sin explicaciones):
{
    "action": "navigate" | "add_to_cart" | "unknown",
    "section": "home" | "cart" | "cuenta" | "kds" | "entrantes" | "bocadillos",
    "item_id": "id_del_producto",
    "quantity": 1
}`;

                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ],
                    model: modelName,
                    temperature: 0.3,
                    max_tokens: 200,
                    response_format: { type: "json_object" }
                });

                const responseText = completion.choices[0]?.message?.content || '{}';
                command = JSON.parse(responseText);

                // Si llegamos aquí, funcionó
                console.log(`✅ Cerebro Groq (${modelName}) respondió:`, command);
                break;

            } catch (e: any) {
                console.warn(`⚠️ Fallo con modelo ${modelName}, intentando siguiente...`, e.message);
                lastError = e;
                continue;
            }
        }

        if (!command) throw lastError || new Error("Todos los modelos fallaron");

        return NextResponse.json(command);

    } catch (error: any) {
        console.error("Brain Error:", error);
        return NextResponse.json({
            action: 'error',
            error: error.message || 'Error desconocido en servidor',
            details: error.toString()
        }, { status: 500 });
    }
}
