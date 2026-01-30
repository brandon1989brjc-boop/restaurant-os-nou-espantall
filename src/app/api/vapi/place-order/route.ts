import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json({ message: "Hello from place-order" });
}

export async function GET(req: NextRequest) {
    return NextResponse.json({ message: "Hello from place-order GET" });
}
