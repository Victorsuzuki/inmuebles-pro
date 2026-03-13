const http = require('http');

const data = Buffer.from('this is a test image content');
const boundary = '--------------------------' + Date.now();

const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Disposition: form-data; name="photos"; filename="test.jpg"\r\n'),
    Buffer.from('Content-Type: image/jpeg\r\n\r\n'),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/properties/TEST_ID/photos',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
    }
};

console.log(`Sending request to http://localhost:8080${options.path}...`);

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
