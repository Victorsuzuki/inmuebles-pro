const bcrypt = require('bcryptjs');
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
        const userId = uuidv4();

        const newUser = {
            id: userId,
            email,
            password: hashedPassword,
            role: role || 'OPERATOR',
            name
        };
        await addRow('Users', newUser);

        // SYNC: Create corresponding entity if needed
        if (role === 'LIMPIADOR') {
            await addRow('Cleaners', {
                id: userId,
                name: name,
                email: email,
                status: 'Activo'
            });
        } else if (role === 'CLIENTE') {
            await addRow('Clients', {
                id: userId,
                name: name,
                email: email,
                status: 'Activo'
            });
        }

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
        } else {
            delete updateData.password;
        }

        const updated = await updateRow('Users', id, updateData);
        if (updated) {
            // SYNC: Update name/email in entity if they changed
            if (updated.role === 'LIMPIADOR') {
                await updateRow('Cleaners', id, {
                    name: updated.name,
                    email: updated.email
                }).catch(() => null); // Silently fail if cleaner record doesn't exist
            } else if (updated.role === 'CLIENTE') {
                await updateRow('Clients', id, {
                    name: updated.name,
                    email: updated.email
                }).catch(() => null);
            }

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

        // Get user to know their role before deletion
        const users = await getRows('Users');
        const user = users.find(u => u.id === id);

        const deleted = await deleteRow('Users', id);
        if (deleted) {
            // SYNC: Delete corresponding entity
            if (user?.role === 'LIMPIADOR') {
                await deleteRow('Cleaners', id).catch(() => null);
            } else if (user?.role === 'CLIENTE') {
                await deleteRow('Clients', id).catch(() => null);
            }
            res.json({ message: 'User deleted' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
