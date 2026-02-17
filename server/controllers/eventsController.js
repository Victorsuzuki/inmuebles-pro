const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

// Helper to check for overlaps
const checkOverlap = async (propertyId, startDate, endDate, excludeEventId = null, existingEvents = null) => {
    const events = existingEvents || await getRows('Events');
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return events.some(ev => {
        if (ev.propertyId !== propertyId) return false;
        if (excludeEventId && ev.id === excludeEventId) return false;
        // Cancelled events don't block — they free the property
        if (ev.status === 'Cancelado') return false;

        const evStart = new Date(ev.startDate).getTime();
        const evEnd = new Date(ev.endDate).getTime();

        return (start <= evEnd && end >= evStart);
    });
};

// Helper to sync property status — reutiliza eventos ya cargados si se le pasan
const syncPropertyStatus = async (propertyId, existingEvents = null) => {
    const events = existingEvents || await getRows('Events');
    const today = new Date().getTime();

    const activeEvent = events.find(ev => {
        if (ev.propertyId !== propertyId) return false;
        // Only Pendiente and Confirmado events affect property status
        if (ev.status === 'Cancelado' || ev.status === 'Completado') return false;
        const start = new Date(ev.startDate).getTime();
        const end = new Date(ev.endDate).getTime();
        return (today >= start && today <= end);
    });

    let newStatus = 'Disponible';
    if (activeEvent) {
        if (activeEvent.type === 'Alquiler') newStatus = 'Alquilado';
        else if (activeEvent.type === 'Mantenimiento') newStatus = 'En Mantenimiento';
    }

    await updateRow('Properties', propertyId, { status: newStatus });
};

const getEvents = async (req, res) => {
    try {
        const events = await getRows('Events');
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching events' });
    }
};

const createEvent = async (req, res) => {
    try {
        const { propertyId, startDate, endDate, type } = req.body;

        if (!propertyId || !startDate || !endDate || !type) {
            return res.status(400).json({ message: 'propertyId, startDate, endDate y type son obligatorios' });
        }

        // Validate dates: start must not be after end
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin.' });
        }

        // Cargar eventos una sola vez para overlap check y sync
        const events = await getRows('Events');

        if (type === 'Alquiler' || type === 'Mantenimiento') {
            const hasOverlap = await checkOverlap(propertyId, startDate, endDate, null, events);
            if (hasOverlap) {
                return res.status(409).json({ message: 'La propiedad ya está ocupada en esas fechas.' });
            }
        }

        const newEvent = {
            id: uuidv4(),
            ...req.body
        };
        await addRow('Events', newEvent);

        // Añadir el nuevo evento a la lista para sync sin re-leer la sheet
        events.push(newEvent);
        await syncPropertyStatus(propertyId, events);

        res.status(201).json(newEvent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating event' });
    }
};

const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { propertyId, startDate, endDate, type } = req.body;

        if (!propertyId) {
            return res.status(400).json({ message: 'propertyId es obligatorio' });
        }

        // Validate dates if both provided
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin.' });
        }

        const events = await getRows('Events');

        if ((type === 'Alquiler' || type === 'Mantenimiento') && startDate && endDate) {
            const hasOverlap = await checkOverlap(propertyId, startDate, endDate, id, events);
            if (hasOverlap) {
                return res.status(409).json({ message: 'La propiedad ya está ocupada en esas fechas (conflicto).' });
            }
        }

        const updated = await updateRow('Events', id, req.body);
        if (updated) {
            await syncPropertyStatus(propertyId);
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating event' });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const events = await getRows('Events');
        const ev = events.find(e => e.id === id);

        if (!ev) return res.status(404).json({ message: 'Event not found' });

        const propertyId = ev.propertyId;
        await deleteRow('Events', id);

        // Filtrar el evento eliminado y reutilizar para sync
        const remainingEvents = events.filter(e => e.id !== id);
        await syncPropertyStatus(propertyId, remainingEvents);

        res.json({ message: 'Event deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting event' });
    }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
