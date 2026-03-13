const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

const SHEET = 'Cleaners';

const getCleaners = async (req, res) => {
    try {
        const cleaners = await getRows(SHEET);
        res.json(cleaners);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching cleaners' });
    }
};

const createCleaner = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        const newCleaner = {
            id: uuidv4(),
            ...req.body,
            status: req.body.status || 'Activo'
        };
        await addRow(SHEET, newCleaner);
        res.status(201).json(newCleaner);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating cleaner' });
    }
};

const updateCleaner = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await updateRow(SHEET, id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Cleaner not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating cleaner' });
    }
};

const deleteCleaner = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if cleaner has schedule assignments
        const schedules = await getRows('CleaningSchedule');
        const assigned = schedules.filter(s => s.cleanerId === id);
        if (assigned.length > 0) {
            return res.status(409).json({
                message: `No se puede eliminar: esta persona tiene ${assigned.length} asignación(es) de limpieza. Elimínalas primero.`
            });
        }

        const deleted = await deleteRow(SHEET, id);
        if (deleted) res.json({ message: 'Cleaner deleted' });
        else res.status(404).json({ message: 'Cleaner not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting cleaner' });
    }
};

module.exports = { getCleaners, createCleaner, updateCleaner, deleteCleaner };
