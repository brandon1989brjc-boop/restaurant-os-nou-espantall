import { NextResponse } from 'next/server';

export async function POST() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
        }

        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-realtime-preview-2024-12-17',
                voice: 'verse',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json({ error: error.error?.message || 'Failed to create session' }, { status: response.status });
        }

        const data = await response.json();

        // Return the ephemeral token and other details to the client
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating voice session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
