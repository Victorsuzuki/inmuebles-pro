
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { getRows, addRow } = require('../services/sheetService');

const ensureAdmin = async () => {
    try {
        console.log('Checking for admin user...');
        const users = await getRows('Users');

        const adminEmail = 'admin@test.com';
        const existingAdmin = users.find(u => u.email === adminEmail);

        if (existingAdmin) {
            console.log('✅ Admin user already exists.');
            return;
        }

        console.log('Admin user not found. Creating...');
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = {
            id: '1',
            email: adminEmail,
            password: hashedPassword,
            name: 'Admin',
            role: 'SUPERVISOR'
        };

        await addRow('Users', newAdmin);
        console.log('✅ Admin user created successfully.');
    } catch (error) {
        console.error('❌ Error ensuring admin user:', error);
        process.exit(1);
    }
};

ensureAdmin();
