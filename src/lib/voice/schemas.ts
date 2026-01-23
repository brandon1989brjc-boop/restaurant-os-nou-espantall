export const TOOLS_SCHEMA = [
    {
        type: "function",
        name: "navigate_to_section",
        description: "Navega a una sección específica de la página web. Úsalo cuando el usuario pida ver el menú, contacto o volver al inicio.",
        parameters: {
            type: "object",
            properties: {
                section_name: {
                    type: "string",
                    enum: ["home", "comidas", "bebidas", "postres", "cart", "reseñas", "filtro", "kds"],
                    description: "El identificador interno de la sección destino."
                },
                context_data: {
                    type: "string",
                    description: "Información opcional para pre-filtrar la sección (ej. 'vinos' si va a bebidas)."
                }
            },
            required: ["section_name"],
            additionalProperties: false
        },
        strict: true
    },
    {
        type: "function",
        name: "update_order_cart",
        description: "Añade, elimina o modifica items en el pedido del cliente.",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["add", "remove", "update"],
                    description: "La acción a realizar sobre el carrito."
                },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            item_name: {
                                type: "string",
                                description: "Nombre del plato o bebida (ej. 'Pizza Margarita')."
                            },
                            quantity: {
                                type: "integer",
                                description: "Cantidad de items."
                            },
                            notes: {
                                type: "string",
                                description: "Modificaciones especiales: 'sin cebolla', 'extra picante', 'bien hecho'."
                            },
                            assigned_to: {
                                type: "string",
                                description: "Nombre del comensal que pide este plato. Ej: 'Juan', 'María', 'el señor de la derecha'."
                            }
                        },
                        required: ["item_name", "quantity", "notes", "assigned_to"],
                        additionalProperties: false
                    }
                }
            },
            required: ["action", "items"],
            additionalProperties: false
        },
        strict: true
    },
    {
        type: "function",
        name: "manage_billing",
        description: "Gestiona el cierre de cuenta y el pago, permitiendo separar cuentas o asignar pagos específicos.",
        parameters: {
            type: "object",
            properties: {
                method: {
                    type: "string",
                    enum: ["split_equally", "individual", "full_table"],
                    description: "Cómo quieren dividir la cuenta."
                },
                payer: {
                    type: "string",
                    description: "Nombre del comensal que va a pagar (si es individual)."
                },
                payment_type: {
                    type: "string",
                    enum: ["card", "cash", "digital_wallet"],
                    description: "El método de pago elegido."
                }
            },
            required: ["method"],
            additionalProperties: false
        },
        strict: true
    },
    {
        type: "function",
        name: "confirm_order",
        description: "Finaliza el pedido actual y lo envía a cocina.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false
        },
        strict: true
    }
];

export const SYSTEM_INSTRUCTION = `
Eres un asistente de camarero inteligente para 'Nou Espantall'.
Tu objetivo es gestionar pedidos, modificaciones y pagos mediante voz.

Capacidades Críticas:
1. **Asignación:** Siempre identifica para quién es cada plato. Si no te lo dicen, pregunta sutilmente: "¿Para quién sería este plato?".
2. **Modificaciones:** Acepta cambios naturales ("sin sal", "más hecho") y guárdalos fielmente.
3. **Pagos:** Gestiona la cuenta. Puedes separar pagos por persona basándote en lo que han pedido.
4. **Claridad:** Confirma siempre lo que has entendido de forma breve.

Reglas:
- Sé conciso.
- Usa 'update_order_cart' para todo lo relacionado con comida/bebida.
- Usa 'manage_billing' para pagos y cierres de cuenta.
- El restaurante es de alta gama, mantén un tono profesional pero cercano.
`;
