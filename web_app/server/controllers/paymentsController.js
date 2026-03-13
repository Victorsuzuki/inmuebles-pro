const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

const getPayments = async (req, res) => {
    try {
        const payments = await getRows('Payments');
        res.json(payments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' });
    }
};

const createPayment = async (req, res) => {
    try {
        const { propertyId, amount, type } = req.body;

        if (!propertyId || !amount || !type) {
            return res.status(400).json({ message: 'propertyId, amount y type son obligatorios' });
        }

        const newPayment = {
            id: uuidv4(),
            ...req.body,
            date: req.body.date || new Date().toISOString().split('T')[0]
        };
        await addRow('Payments', newPayment);
        res.status(201).json(newPayment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating payment' });
    }
};

const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await updateRow('Payments', id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Payment not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating payment' });
    }
};

const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await deleteRow('Payments', id);
        if (deleted) res.json({ message: 'Payment deleted' });
        else res.status(404).json({ message: 'Payment not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting payment' });
    }
};

module.exports = { getPayments, createPayment, updatePayment, deletePayment };
