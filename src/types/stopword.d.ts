declare module 'stopword' {
    export const es: string[];
    export const en: string[];
    export function removeStopwords(tokens: string[], stopwords?: string[]): string[];
}
