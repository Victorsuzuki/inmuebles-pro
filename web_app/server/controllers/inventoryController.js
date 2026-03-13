const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

// ===================== INVENTORY ITEMS =====================

const getPropertyInventory = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const items = await getRows('Inventory');
        const filtered = items.filter(i => i.propertyId === propertyId);
        filtered.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.item || '').localeCompare(b.item || ''));
        res.json(filtered);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching inventory' });
    }
};

const addInventoryItem = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { category, item, quantity, size, condition, notes } = req.body;

        if (!item) return res.status(400).json({ message: 'El nombre del artículo es obligatorio' });

        const newItem = {
            id: uuidv4(),
            propertyId,
            category: category || 'General',
            item,
            quantity: quantity || '1',
            size: size || '',
            condition: condition || 'Bueno',
            notes: notes || '',
            lastUpdated: new Date().toISOString().split('T')[0],
            updatedBy: req.user?.name || 'Sistema'
        };

        await addRow('Inventory', newItem);
        res.status(201).json(newItem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding inventory item' });
    }
};

const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {
            ...req.body,
            lastUpdated: new Date().toISOString().split('T')[0],
            updatedBy: req.user?.name || 'Sistema'
        };
        const updated = await updateRow('Inventory', id, updates);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Item not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating inventory item' });
    }
};

const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        // Also delete related incidents
        const incidents = await getRows('InventoryIncidents');
        for (const inc of incidents.filter(i => i.inventoryId === id)) {
            await deleteRow('InventoryIncidents', inc.id);
        }
        const deleted = await deleteRow('Inventory', id);
        if (deleted) res.json({ message: 'Item and related incidents deleted' });
        else res.status(404).json({ message: 'Item not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting inventory item' });
    }
};

// ===================== INCIDENTS =====================

const getPropertyIncidents = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { status } = req.query;
        const incidents = await getRows('InventoryIncidents');
        let filtered = incidents.filter(i => i.propertyId === propertyId);
        if (status) filtered = filtered.filter(i => i.status === status);
        filtered.sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''));
        res.json(filtered);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching incidents' });
    }
};

const getAllIncidents = async (req, res) => {
    try {
        const { status, propertyId } = req.query;
        let incidents = await getRows('InventoryIncidents');
        if (status) incidents = incidents.filter(i => i.status === status);
        if (propertyId) incidents = incidents.filter(i => i.propertyId === propertyId);
        incidents.sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''));

        // Enrich with property addresses and item names
        const properties = await getRows('Properties');
        const inventory = await getRows('Inventory');
        const propMap = new Map();
        properties.forEach(p => propMap.set(p.id, p.address));
        const invMap = new Map();
        inventory.forEach(i => invMap.set(i.id, i.item));

        const result = incidents.map(inc => ({
            ...inc,
            propertyAddress: propMap.get(inc.propertyId) || 'Desconocida',
            itemName: invMap.get(inc.inventoryId) || '—'
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching incidents' });
    }
};

const createIncident = async (req, res) => {
    try {
        const { inventoryId, propertyId, description } = req.body;

        if (!description) return res.status(400).json({ message: 'La descripción es obligatoria' });

        const incident = {
            id: uuidv4(),
            inventoryId: inventoryId || '',
            propertyId: propertyId || '',
            description,
            status: 'Pendiente',
            createdDate: new Date().toISOString().split('T')[0],
            createdBy: req.user?.name || 'Sistema',
            resolvedDate: '',
            resolvedBy: '',
            resolutionNotes: ''
        };

        await addRow('InventoryIncidents', incident);
        res.status(201).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating incident' });
    }
};

const resolveIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolutionNotes } = req.body;

        const updated = await updateRow('InventoryIncidents', id, {
            status: 'Solventado',
            resolvedDate: new Date().toISOString().split('T')[0],
            resolvedBy: req.user?.name || 'Sistema',
            resolutionNotes: resolutionNotes || ''
        });

        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Incident not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error resolving incident' });
    }
};

module.exports = {
    getPropertyInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    getPropertyIncidents, getAllIncidents, createIncident, resolveIncident
};
