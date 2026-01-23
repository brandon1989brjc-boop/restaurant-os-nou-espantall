import { NextRequest, NextResponse } from 'next/server';
import { LocalIntentMatcher } from '@/lib/voice/LocalIntentMatcher';
import menuData from '@/lib/menu.json';

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        // Aplanar el menú
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

        // Usar el motor local
        const matcher = new LocalIntentMatcher(simpleMenu);
        const intent = matcher.match(text);

        console.log(`🧠 Local Brain processed: "${text}" → `, intent);

        // Convertir intent a formato esperado
        const response = {
            action: intent.action,
            section: intent.section,
            item_id: intent.item_id,
            quantity: intent.quantity || 1,
            confidence: intent.confidence,
            _source: 'local_matcher' // Debug info
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error("Brain Error:", error);
        return NextResponse.json({
            action: 'error',
            error: error.message || 'Error desconocido',
            details: error.toString()
        }, { status: 500 });
    }
}
