
async function debugEndpoint() {
    const url = 'https://restaurant-os-wine.vercel.app/api/vapi/place-order/';
    console.log(`🔍 Testing endpoint: ${url}`);

    const payload = {
        message: {
            toolCallList: [
                {
                    id: 'debug_test_' + Date.now(),
                    function: {
                        name: 'confirmar_pedido',
                        arguments: JSON.stringify({
                            items: [{ id: 'test', name: 'Test Item', quantity: 1, price: 10 }],
                            nombre_cliente: 'Debugger',
                            mesa: 'Mesa Debug',
                            total: 10
                        })
                    }
                }
            ]
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const body = await response.text();

        console.log(`📡 Status Code: ${status}`);
        console.log(`📦 Response Body:`, body);

    } catch (error) {
        console.error(`❌ Request Error:`, error.message);
    }
}

debugEndpoint();
