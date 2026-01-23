import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import menuData from '@/lib/menu.json';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { text, context, history = [] } = await req.json();

    const systemPrompt = `
Eres la IA de Nou Espantall. Tu objetivo es extraer pedidos estructurados usando Named Entity Recognition (NER) y Slot Filling.

### REGLAS DE SLOT FILLING:
1. **Identifica Entidades**: Extrae Item (ID base), Quantity (Número), y Modifiers (add/remove/preference).
2. **Análisis de Dependencias**: Vincula los modificadores al plato más cercano gramaticalmente. Ejemplo: "Ensalada con salsa y Burguer sin salsa" -> Ensalada(con salsa), Burguer(sin salsa).
3. **Contexto Conversacional**: USA EL HISTORIAL para resolver referencias anafóricas.
4. **Slots Obligatorios**: Si un ítem requiere una elección (punto de carne, aliño) y falta, pregunta amablemente.

### ESQUEMA DE SALIDA (JSON):
{
  "action": "navigate" | "add_to_cart" | "clear_cart" | "clarify",
  "items": [
    {
      "item_id": "string",
      "quantity": number,
      "modifications": [{ "type": "add"|"remove"|"preference", "content": "string" }]
    }
  ],
  "section": "string_id",
  "response_text": "Explicación breve o pregunta de aclaración"
}

### MENÚ (Multilingüe):
${JSON.stringify(menuData.categories.map(c => ({
      id: c.id,
      names: { es: c.name.es, en: (c.name as any).en },
      items: c.items.map(i => ({
        id: i.id,
        names: {
          es: i.name.es,
          en: (i.name as any).en,
          synonyms: (i as any).keywords || []
        }
      }))
    })))}
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-3), // Ventana de contexto de 3 turnos
      { role: 'user', content: text }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: 'llama3-70b-8192',
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('CRITICAL: Voice Process Error', {
      message: error.message,
      hasKey: !!process.env.GROQ_API_KEY
    });
    return NextResponse.json({
      error: 'Fallo en procesamiento semántico',
      details: error.message,
      config_error: !process.env.GROQ_API_KEY ? 'Falta GROQ_API_KEY en Vercel' : null
    }, { status: 500 });
  }
}
