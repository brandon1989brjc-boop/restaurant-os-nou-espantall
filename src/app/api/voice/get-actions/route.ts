import { NextRequest, NextResponse } from 'next/server';

// Este endpoint es llamado por el frontend para obtener las acciones pendientes
export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id') || 'default';

    // TODO: Implementar lectura del sessionStore
    // Por ahora retornamos array vacío

    return NextResponse.json({
        actions: []
    });
}
