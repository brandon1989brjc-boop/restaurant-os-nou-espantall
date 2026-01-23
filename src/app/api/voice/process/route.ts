import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import menuData from '@/lib/menu.json';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { text, context } = await req.json();

    const systemPrompt = `
Eres el cerebro de una "Carta Inteligente" para el restaurante Nou Espantall.
Tu tarea es convertir el lenguaje natural (en cualquier idioma) en un JSON estructurado de pedido.

### REGLAS DE NAVEGACIÓN:
- Secciones de menú (IDs): "entrantes", "bocadillos", "para_compartir", "tablas", "torradas", "combinados", "montaditos", "postres", "bebidas".
- Secciones especiales: "home" (inicio), "cart" (ver carrito), "cuenta" (ver cuenta).

### REGLAS CRÍTICAS:
1. Mapea siempre los platos a los IDs canónicos presentes en el MENÚ proporcionado.
2. Identifica cantidades y modificadores. Atribuye los modificadores al plato correcto de forma jerárquica.
3. El JSON SIEMPRE debe incluir un "response_text" amable y breve en el idioma del usuario (ej: "¡Claro! Te añado las patatas.").
4. Si el usuario pide navegar, usa la acción "navigate" y especifica la "section".

### MENÚ DE CONTEXTO:
${JSON.stringify(menuData.categories.map(c => ({
      id: c.id,
      name: c.name.es,
      items: c.items.map(i => ({ id: i.id, name: i.name.es }))
    })))}

### FORMATO DE SALIDA (JSON PURO):
{
  "action": "navigate" | "add_to_cart" | "clear_cart" | "unknown",
  "section": "string_id",
  "items": [
    {
      "item_id": "string",
      "quantity": number,
      "modifications": [
        { "type": "remove" | "add" | "preference", "content": "string" }
      ]
    }
  ],
  "response_text": "Respuesta breve y amable en el idioma del usuario"
}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
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
