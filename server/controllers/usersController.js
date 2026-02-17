const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

const SALT_ROUNDS = 10;

const getUsers = async (req, res) => {
    try {
        const users = await getRows('Users');
        // Filtrar campo password antes de enviar al frontend
        const safeUsers = users.map(({ password, _rowIndex, ...user }) => user);
        res.json(safeUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

const createUser = async (req, res) => {
    try {
        const { email, password, role, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, contraseña y nombre son obligatorios' });
        }

        // Verificar duplicados
        const existingUsers = await getRows('Users');
        if (existingUsers.find(u => u.email === email)) {
            return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = {
            id: uuidv4(),
            email,
            password: hashedPassword,
            role: role || 'OPERATOR',
            name
        };
        await addRow('Users', newUser);

        // Devolver sin password
        const { password: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Si se envía password, hashear antes de guardar
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
        }

        const updated = await updateRow('Users', id, updateData);
        if (updated) {
            // Filtrar password de la respuesta
            const { password, ...safeUser } = updated;
            res.json(safeUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await deleteRow('Users', id);
        if (deleted) res.json({ message: 'User deleted' });
        else res.status(404).json({ message: 'User not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
