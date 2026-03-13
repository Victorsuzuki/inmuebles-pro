# Inmuebles Pro - MCP Server

Este servidor implementa el **Model Context Protocol (MCP)** para exponer los datos y acciones de Inmuebles Pro a agentes de Inteligencia Artificial (como Claude, IDEs con IA, etc).

## Características

### Recursos (Lectura)
*   `inmuebles://properties`: Listado completo de propiedades.
*   `inmuebles://events`: Calendario de eventos.

### Herramientas (Acciones)
*   `search_available_properties(startDate, endDate)`: Busca propiedades libres.
*   `book_visit(propertyId, clientName, date)`: Agenda una visita.
*   `get_stats()`: Estadísticas de ocupación.

## Configuración para Claude Desktop

Para usar este agente con Claude Desktop, edita tu archivo de configuración (normalmente en `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "inmuebles-pro": {
      "command": "node",
      "args": [
        "D:\\Escritorio\\TMP\\desarrollos\\Inmuebles_pro\\web_app\\mcp_server\\index.js"
      ]
    }
  }
}
```

Asegúrate de que la ruta al archivo `index.js` sea correcta.

## Instalación y Ejecución Local

1.  Instalar dependencias:
    ```bash
    npm install
    ```
2.  Ejecutar servidor (modo stdio):
    ```bash
    node index.js
    ```
3.  Probar con script demo:
    ```bash
    node client_demo.js
    ```

## ¿Cómo compartirlo con tu Agencia?

Este agente conecta con **Google Sheets**, que está en la nube. Esto significa que **varias personas** pueden usar este agente desde sus propios ordenadores simultáneamente.

1.  Comparte esta carpeta `mcp_server` con tu equipo.
2.  Dales el archivo `.env` con las credenciales (o crea una Service Account nueva para ellos).
3.  Cada uno configura su **Claude Desktop** apuntando a su copia local del servidor.

¡Todos verán los mismos datos en tiempo real porque leen del mismo Excel!
