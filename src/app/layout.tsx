import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
});

export const metadata: Metadata = {
    title: "Restaurant OS | Immersive AI Menu",
    description: "Experience the future of dining with our AI-powered immersive menu.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={`${outfit.variable} antialiased`}>
                <SmoothScroll>
                    {children}
                </SmoothScroll>
            </body>
        </html>
    );
}
