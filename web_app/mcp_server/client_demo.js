const { spawn } = require('child_process');
const path = require('path');

const serverScript = path.join(__dirname, 'index.js');
console.log(`Starting MCP Server: node ${serverScript}`);

const server = spawn('node', [serverScript], { cwd: __dirname });

server.stderr.on('data', (data) => console.error(`[SERVER LOG] ${data.toString().trim()}`));

let buffer = '';

server.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    // Keep the last chunk if it doesn't end with a newline
    buffer = lines.pop();

    for (const line of lines) {
        if (!line.trim()) continue;
        console.log(`[RX] ${line.substring(0, 100)}...`); // Log truncated msg
        try {
            const msg = JSON.parse(line);
            handleMessage(msg);
        } catch (e) {
            console.error('Invalid JSON received:', line);
        }
    }
});

function send(msg) {
    const str = JSON.stringify(msg);
    console.log(`[TX] ${str}`);
    server.stdin.write(str + '\n');
}

let step = 0;

function handleMessage(msg) {
    // Step 0: Initialized response
    if (step === 0 && msg.id === 1) {
        console.log('✅ Handshake successful');

        // Notify initialized
        send({
            jsonrpc: "2.0",
            method: "notifications/initialized"
        });

        // Request tool list
        console.log('👉 Requesting Tool List...');
        step = 1;
        send({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list"
        });
    }
    // Step 1: Tool list received
    else if (step === 1 && msg.id === 2) {
        console.log('✅ Tools received:', msg.result.tools.map(t => t.name).join(', '));

        // Call tool: get_stats
        console.log('👉 Calling tool: get_stats');
        step = 2;
        send({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
                name: "get_stats",
                arguments: {}
            }
        });
    }
    // Step 2: Stats received
    else if (step === 2 && msg.id === 3) {
        console.log('✅ Stats Result received:');
        try {
            // MCP tool result content is array of objects {type: text, text: ...}
            const contentText = msg.result.content[0].text;
            console.log(contentText);
        } catch (e) {
            console.log(JSON.stringify(msg.result, null, 2));
        }

        // Call tool: search_available_properties
        console.log('👉 Calling tool: search_available_properties');
        step = 3;
        send({
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: {
                name: "search_available_properties",
                arguments: {
                    startDate: "2026-03-01",
                    endDate: "2026-03-05"
                }
            }
        });
    }
    // Step 3: Search received
    else if (step === 3 && msg.id === 4) {
        console.log('✅ Search Result received (first 2 items):');
        try {
            const props = JSON.parse(msg.result.content[0].text);
            console.log(JSON.stringify(props.slice(0, 2), null, 2));
        } catch (e) { console.log('Error parsing result'); }

        console.log('🎉 Demo Completed Successfully!');
        server.kill();
        process.exit(0);
    }
}

// Start Handshake
console.log('👉 Sending Initialize...');
send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "demo-client", version: "1.0" }
    }
});
