const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow } = require('../services/sheetService');

// ===========================================================
// CLIENT PORTAL — Properties & Registration
// ===========================================================

/** Get available properties with photos (public) */
router.get('/properties', async (req, res) => {
    try {
        const properties = await getRows('Properties');
        const photos = await getRows('PropertyPhotos');

        const available = properties.filter(p =>
            String(p.archived || '').toLowerCase() !== 'true' &&
            ['Disponible', 'Alquilado', 'En Mantenimiento'].includes(p.status)
        );

        const result = available.map(prop => ({
            id: prop.id, address: prop.address, city: prop.city, zip: prop.zip,
            type: prop.type, price: prop.price, rentalPrice: prop.rentalPrice,
            description: prop.description, bedrooms: prop.bedrooms, bathrooms: prop.bathrooms,
            sqMeters: prop.sqMeters, floor: prop.floor, hasElevator: prop.hasElevator,
            hasParking: prop.hasParking, hasPool: prop.hasPool, hasTerrace: prop.hasTerrace,
            hasAC: prop.hasAC, hasHeating: prop.hasHeating, heatingType: prop.heatingType,
            furnished: prop.furnished, orientation: prop.orientation, yearBuilt: prop.yearBuilt,
            energyCert: prop.energyCert, communityFees: prop.communityFees, dossierUrl: prop.dossierUrl,
            photos: photos.filter(ph => ph.propertyId === prop.id)
                .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0))
                .map(ph => ({ id: ph.id, url: ph.driveUrl, caption: ph.caption }))
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching properties' });
    }
});

/** Self-register as client */
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, dni } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Nombre y email son obligatorios' });
        }
        const existingClients = await getRows('Clients');
        if (existingClients.find(c => c.email === email)) {
            return res.status(409).json({ message: 'Este email ya está registrado' });
        }
        const client = {
            id: uuidv4(), name, email, phone: phone || '', dni: dni || '',
            status: 'Activo', notes: 'Auto-registrado'
        };
        await addRow('Clients', client);
        res.status(201).json({ message: 'Registro exitoso', client: { id: client.id, name, email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el registro' });
    }
});

// ===========================================================
// CLEANER PORTAL — Cleaners, Schedule, Logs
// ===========================================================

/** Get active cleaners */
router.get('/cleaners', async (req, res) => {
    try {
        const cleaners = await getRows('Cleaners');
        res.json(cleaners.filter(c => c.status === 'Activo').map(c => ({ id: c.id, name: c.name })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

/** Get properties (minimal for cleaner lookup) */
router.get('/cleaner-properties', async (req, res) => {
    try {
        const props = await getRows('Properties');
        res.json(props.filter(p => p.archived !== 'true').map(p => ({ id: p.id, address: p.address })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

/** Get active cleaning schedule */
router.get('/cleaning-schedule', async (req, res) => {
    try {
        const schedule = await getRows('CleaningSchedule');
        res.json(schedule.filter(s => s.status === 'Activo'));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

/** Get logs for a specific cleaner */
router.get('/cleaning-logs', async (req, res) => {
    try {
        const { cleanerId } = req.query;
        if (!cleanerId) return res.status(400).json({ message: 'cleanerId required' });
        const logs = await getRows('CleaningLogs');
        const mine = logs.filter(l => l.cleanerId === cleanerId);
        mine.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        res.json(mine.slice(0, 50));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

/** Log entry */
router.post('/cleaning-logs/entry', async (req, res) => {
    try {
        const { cleanerId, propertyId, scheduleId } = req.body;
        if (!cleanerId || !propertyId) {
            return res.status(400).json({ message: 'cleanerId y propertyId son obligatorios' });
        }
        const now = new Date();
        const log = {
            id: uuidv4(),
            cleanerId,
            propertyId,
            scheduleId: scheduleId || '',
            date: now.toISOString().split('T')[0],
            entryTime: now.toTimeString().slice(0, 5),
            exitTime: '',
            observations: '',
            status: 'En curso'
        };
        await addRow('CleaningLogs', log);
        res.status(201).json(log);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging entry' });
    }
});

/** Log exit */
router.put('/cleaning-logs/:id/exit', async (req, res) => {
    try {
        const { id } = req.params;
        const { observations } = req.body;
        const now = new Date();
        const updated = await updateRow('CleaningLogs', id, {
            exitTime: now.toTimeString().slice(0, 5),
            observations: observations || '',
            status: 'Completado'
        });
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Log not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging exit' });
    }
});

// ===========================================================
// OWNER PORTAL — Properties, Events, Payments by owner
// ===========================================================

/** Get all properties (for owner view) */
router.get('/owner-properties', async (req, res) => {
    try {
        const properties = await getRows('Properties');
        res.json(properties);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

/** Get events (public — no sensitive data) */
router.get('/events', async (req, res) => {
    try {
        const events = await getRows('Events');
        res.json(events.map(e => ({
            id: e.id, propertyId: e.propertyId, type: e.type,
            startDate: e.startDate, endDate: e.endDate, status: e.status
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

/** Get payments (public — no sensitive data) */
router.get('/payments', async (req, res) => {
    try {
        const payments = await getRows('Payments');
        res.json(payments.map(p => ({
            id: p.id, propertyId: p.propertyId, amount: p.amount,
            date: p.date, type: p.type, status: p.status
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

module.exports = router;
