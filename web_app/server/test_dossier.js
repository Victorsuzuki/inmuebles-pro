const http = require('http');

const data = Buffer.from('%PDF-1.4\n%TEST PDF CONTENT');
const boundary = '--------------------------' + Date.now();

const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Disposition: form-data; name="dossier"; filename="test_dossier.pdf"\r\n'),
    Buffer.from('Content-Type: application/pdf\r\n\r\n'),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`)
]);

// Since I temporarily moved photos above authenticate, I'll do the same for dossier if needed.
// But first let's try with a dummy ID.
const propId = '1771274696363'; // Using ID from user logs
const options = {
    hostname: 'localhost',
    port: 8080,
    path: `/api/properties/${propId}/dossier`,
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
    }
};

console.log(`Sending dossier request to http://localhost:8080${options.path}...`);

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let responseBody = '';
    res.on('data', (chunk) => responseBody += chunk);
    res.on('end', () => {
        console.log('BODY:', responseBody);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(body);
req.end();
