const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

const getProperties = async (req, res) => {
    try {
        const properties = await getRows('Properties');
        res.json(properties);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching properties' });
    }
};

const createProperty = async (req, res) => {
    try {
        const { address, type } = req.body;

        if (!address || !type) {
            return res.status(400).json({ message: 'address y type son obligatorios' });
        }

        const newProperty = {
            id: uuidv4(),
            ...req.body,
            status: 'Disponible' // Always starts as Disponible — status is driven by events
        };
        await addRow('Properties', newProperty);

        res.status(201).json(newProperty);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating property' });
    }
};

const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent manual status override — strip it from the body
        const { status, ...safeBody } = req.body;

        const updated = await updateRow('Properties', id, safeBody);
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating property' });
    }
};

const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if property has associated events
        const events = await getRows('Events');
        const associatedEvents = events.filter(ev => ev.propertyId === id);

        if (associatedEvents.length > 0) {
            return res.status(409).json({
                message: `No se puede eliminar: la propiedad tiene ${associatedEvents.length} evento(s) asociado(s). Elimínalos primero.`
            });
        }

        const deleted = await deleteRow('Properties', id);

        if (deleted) {
            res.json({ message: 'Property deleted' });
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting property' });
    }
};

module.exports = { getProperties, createProperty, updateProperty, deleteProperty };
