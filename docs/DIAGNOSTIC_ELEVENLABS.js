/**
 * Script de Diagnóstico - ElevenLabs WebSocket
 * 
 * Pega este código en la consola del navegador (F12) para diagnosticar problemas
 */

console.log('🔍 DIAGNÓSTICO ELEVENLABS WEBSOCKET\n');

// 1. Verificar variables de entorno
console.log('📋 Variables de entorno:');
console.log('- Agent ID:', process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
console.log('- API Key:', process.env.NEXT_PUBLIC_LEVELLABS_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('- WebSocket URL:', process.env.NEXT_PUBLIC_LEVELLABS_WS_URL);
console.log('- Voice Client:', process.env.NEXT_PUBLIC_VOICE_CLIENT);
console.log('- Debug:', process.env.NEXT_PUBLIC_VOICE_DEBUG);

// 2. Test de conexión WebSocket manual
console.log('\n🔌 Probando conexión WebSocket...');

const wsUrl = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_5901kfkre4wwf2wr9reb6kj6de16';
const testWs = new WebSocket(wsUrl);

testWs.onopen = () => {
    console.log('✅ WebSocket conectado exitosamente');

    // Enviar autenticación
    testWs.send(JSON.stringify({
        type: 'auth',
        data: {
            apiKey: process.env.NEXT_PUBLIC_LEVELLABS_API_KEY
        }
    }));
};

testWs.onmessage = (msg) => {
    console.log('📨 Mensaje recibido:', msg.data);
};

testWs.onerror = (error) => {
    console.error('❌ Error de WebSocket:', error);
};

testWs.onclose = (event) => {
    console.log('🔴 WebSocket cerrado:', event.code, event.reason);
};

// 3. Test de micrófono
console.log('\n🎤 Probando acceso a micrófono...');
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        console.log('✅ Micrófono accesible');
        stream.getTracks().forEach(track => track.stop());
    })
    .catch(error => {
        console.error('❌ Error de micrófono:', error);
    });

// 4. Verificar MediaRecorder
console.log('\n🎬 Verificando MediaRecorder...');
const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
];

mimeTypes.forEach(type => {
    const supported = MediaRecorder.isTypeSupported(type);
    console.log(`- ${type}: ${supported ? '✅' : '❌'}`);
});

console.log('\n📊 Diagnóstico completado. Revisa los resultados arriba.');
