import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { LocalIntentMatcher } from '@/lib/voice/LocalIntentMatcher';
import menuData from '@/lib/menu.json';

// Inicializar Groq solo si la API Key existe
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        // 1. Preparar Menú para la Inteligencia
        const data: any = menuData;
        const simpleMenu = data.categories.flatMap((cat: any) =>
            cat.items.map((item: any) => ({
                id: item.id,
                name: item.name.es,
                category: cat.name.es,
                keywords: item.keywords || [],
                price: item.price
            }))
        ).concat(data.featuredDish ? [{
            id: data.featuredDish.id,
            name: data.featuredDish.name.es,
            category: 'Especialidad',
            keywords: data.featuredDish.keywords || [],
            price: data.featuredDish.price
        }] : []);

        // 2. Primero intentamos el Cerebro Local (Búsqueda inmediata)
        const localMatcher = new LocalIntentMatcher(simpleMenu);
        const localResult = localMatcher.match(text);

        // Si el cerebro local está MUY seguro (ej: "la cuenta", "ver bebidas"), respondemos ya.
        if (localResult.confidence > 0.9) {
            return NextResponse.json({ ...localResult, _source: 'local_fast' });
        }

        // 3. Si es algo complejo o el local no está seguro, llamamos a la Inteligencia de Groq
        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Eres el sistema inteligente de voz de "Nou Espantall Bar". 
                            Tu objetivo es convertir el habla del cliente en JSON de acción.
                            
                            MENÚ DISPONIBLE:
                            ${JSON.stringify(simpleMenu)}
                            
                            INSTRUCCIONES:
                            - Si el cliente quiere añadir comida/bebida: action="add_to_cart", item_id, quantity.
                            - Si quiere ver una categoría o sección: action="navigate", section (ej: "bebidas", "cart", "cuenta").
                            - Sé flexible con los nombres: "birra" -> cerveza, "hambre" -> ver carta.
                            - Responde SOLO con el objeto JSON.`
                        },
                        { role: "user", content: text }
                    ],
                    model: "llama-3.1-70b-versatile",
                    temperature: 0.1,
                    max_tokens: 150,
                    response_format: { type: "json_object" }
                });

                const aiResponse = JSON.parse(completion.choices[0]?.message?.content || '{}');

                // Si la IA encontró algo válido, lo mandamos
                if (aiResponse.action !== 'unknown') {
                    return NextResponse.json({ ...aiResponse, _source: 'groq_ai' });
                }
            } catch (aiError) {
                console.error("AI Brain catch error, falling back to local:", aiError);
            }
        }

        // 4. Último recurso: Devolvemos lo que el local haya encontrado aunque sea con baja confianza
        return NextResponse.json({ ...localResult, _source: 'local_fallback' });

    } catch (error: any) {
        return NextResponse.json({ action: 'error', error: error.message }, { status: 500 });
    }
}
