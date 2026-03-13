#!/usr/bin/env node

/**
 * MCP Server for Inmuebles Pro
 * Exposes Google Sheets data as Resources and Tools.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    ListToolsRequestSchema,
    CallToolRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load environment variables from parent server directory
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Import existing services
// Note: We are reusing the sheetService from the backend
const { getRows, addRow } = require('../server/services/sheetService');

// Create MCP Server instance
const server = new Server(
    {
        name: "inmuebles-pro-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

/**
 * RESOURCES
 * Expose data as read-only resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: "inmuebles://properties",
                name: "Lista de Propiedades",
                description: "Listado completo de inmuebles con su estado actual.",
                mimeType: "application/json",
            },
            {
                uri: "inmuebles://events",
                name: "Calendario de Eventos",
                description: "Listado de reservas y mantenimientos.",
                mimeType: "application/json",
            }
        ]
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "inmuebles://properties") {
        const properties = await getRows('Properties');
        return {
            contents: [{
                uri,
                mimeType: "application/json",
                text: JSON.stringify(properties, null, 2)
            }]
        };
    }

    if (uri === "inmuebles://events") {
        const events = await getRows('Events');
        return {
            contents: [{
                uri,
                mimeType: "application/json",
                text: JSON.stringify(events, null, 2)
            }]
        };
    }

    throw new Error(`Resource not found: ${uri}`);
});

/**
 * TOOLS
 * Expose actionable functions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_available_properties",
                description: "Busca propiedades disponibles en un rango de fechas.",
                inputSchema: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", description: "Fecha inicio (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "Fecha fin (YYYY-MM-DD)" }
                    },
                    required: ["startDate", "endDate"]
                }
            },
            {
                name: "book_visit",
                description: "Agenda una visita para un cliente.",
                inputSchema: {
                    type: "object",
                    properties: {
                        propertyId: { type: "string", description: "ID de la propiedad" },
                        clientName: { type: "string", description: "Nombre del cliente" },
                        clientEmail: { type: "string", description: "Email del cliente" },
                        date: { type: "string", description: "Fecha de la visita (YYYY-MM-DD)" },
                        notes: { type: "string", description: "Notas adicionales" }
                    },
                    required: ["propertyId", "clientName", "date"]
                }
            },
            {
                name: "get_stats",
                description: "Obtiene estadísticas básicas de ocupación.",
                inputSchema: {
                    type: "object",
                    properties: {},
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search_available_properties") {
        const { startDate, endDate } = args;
        const events = await getRows('Events');
        const properties = await getRows('Properties');

        // Logic to find free properties
        // Simplified check: exclude properties with overlapping events
        // Note: Reusing logic similar to backend but simplified here for demo
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        const occupiedPropertyIds = new Set();
        events.forEach(ev => {
            if (ev.status === 'Cancelado') return;
            const evStart = new Date(ev.startDate).getTime();
            const evEnd = new Date(ev.endDate).getTime();
            if (start <= evEnd && end >= evStart) {
                occupiedPropertyIds.add(ev.propertyId);
            }
        });

        const available = properties.filter(p => !occupiedPropertyIds.has(p.id));

        return {
            content: [{
                type: "text",
                text: JSON.stringify(available, null, 2)
            }]
        };
    }

    if (name === "book_visit") {
        const { propertyId, clientName, clientEmail, date, notes } = args;

        // 1. Find or Create Client
        const clients = await getRows('Clients');
        let clientId = clients.find(c => c.email === clientEmail || c.name === clientName)?.id;

        if (!clientId) {
            clientId = uuidv4();
            await addRow('Clients', {
                id: clientId,
                name: clientName,
                email: clientEmail || '',
                status: 'Activo',
                notes: 'Creado vía Agente MCP'
            });
        }

        // 2. Create Event (Visita)
        const eventId = uuidv4();
        await addRow('Events', {
            id: eventId,
            propertyId,
            clientId,
            type: 'Visita',
            startDate: date,
            endDate: date, // Visitas are single day usually
            status: 'Pendiente',
            description: notes || 'Visita agendada por Agente MCP'
        });

        return {
            content: [{
                type: "text",
                text: `Visita agendada con éxito. ID Evento: ${eventId}, Cliente ID: ${clientId}`
            }]
        };
    }

    if (name === "get_stats") {
        const properties = await getRows('Properties');
        const total = properties.length;
        const rented = properties.filter(p => p.status === 'Alquilado').length;
        const available = properties.filter(p => p.status === 'Disponible').length;

        return {
            content: [{
                type: "text",
                text: `Total Propiedades: ${total}\nAlquiladas: ${rented}\nDisponibles: ${available}\nOcupación: ${Math.round((rented / total) * 100)}%`
            }]
        };
    }

    throw new Error(`Tool not found: ${name}`);
});

// Start Server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on Stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
