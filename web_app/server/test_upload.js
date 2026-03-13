const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        console.log('Starting test upload to http://localhost:8080/api/properties/TEST_ID/photos');
        const fd = new FormData();
        // Create a dummy buffer since we don't have a real file
        const buffer = Buffer.from('this is a test image');
        fd.append('photos', buffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

        const res = await axios.post('http://localhost:8080/api/properties/TEST_ID/photos', fd, {
            headers: fd.getHeaders()
        });

        console.log('Response Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error in testUpload:', err.response?.data || err.message);
    }
}

testUpload();
