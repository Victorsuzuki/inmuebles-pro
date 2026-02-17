const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

const getClients = async (req, res) => {
    try {
        const clients = await getRows('Clients');
        res.json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching clients' });
    }
};

const createClient = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        const newClient = {
            id: uuidv4(),
            ...req.body
        };
        await addRow('Clients', newClient);
        res.status(201).json(newClient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating client' });
    }
};

const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await updateRow('Clients', id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Client not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating client' });
    }
};

const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await deleteRow('Clients', id);
        if (deleted) res.json({ message: 'Client deleted' });
        else res.status(404).json({ message: 'Client not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting client' });
    }
};

module.exports = { getClients, createClient, updateClient, deleteClient };
