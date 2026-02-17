const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getRows, addRow } = require('../services/sheetService');

const SECRET_KEY = process.env.JWT_SECRET || 'dev_secret_key';
const SALT_ROUNDS = 10;

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    try {
        const users = await getRows('Users');
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const register = async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios (email, password, name, role)' });
    }

    try {
        const users = await getRows('Users');
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            name,
            role
        };

        await addRow('Users', newUser);
        res.status(201).json({ message: 'Usuario creado' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

module.exports = { login, register };
