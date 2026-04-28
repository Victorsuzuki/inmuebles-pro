const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

// Spanish month names
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Build per-period rent entries from startDate to endDate
function buildRentEntries(startDate, endDate, rentalPeriod, agreedPrice) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const price = parseFloat(agreedPrice) || 0;
    const entries = [];

    if (rentalPeriod === 'Mensual') {
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end) {
            entries.push({
                concept: `Renta ${MONTHS_ES[cur.getMonth()]} ${cur.getFullYear()}`,
                dueDate: cur.toISOString().split('T')[0],
                amount: price
            });
            cur.setMonth(cur.getMonth() + 1);
        }
    } else if (rentalPeriod === 'Diario') {
        const cur = new Date(start);
        while (cur <= end) {
            const dd = String(cur.getDate()).padStart(2,'0');
            const mm = String(cur.getMonth()+1).padStart(2,'0');
            entries.push({
                concept: `Renta ${dd}/${mm}/${cur.getFullYear()}`,
                dueDate: cur.toISOString().split('T')[0],
                amount: price
            });
            cur.setDate(cur.getDate() + 1);
        }
    } else if (rentalPeriod === 'Semanal') {
        const cur = new Date(start);
        let weekNum = 1;
        while (cur <= end) {
            entries.push({
                concept: `Renta Semana ${weekNum}`,
                dueDate: cur.toISOString().split('T')[0],
                amount: price
            });
            cur.setDate(cur.getDate() + 7);
            weekNum++;
        }
    } else if (rentalPeriod === 'Quincenal') {
        const cur = new Date(start);
        let qNum = 1;
        while (cur <= end) {
            entries.push({
                concept: `Renta Quincena ${qNum}`,
                dueDate: cur.toISOString().split('T')[0],
                amount: price
            });
            cur.setDate(cur.getDate() + 15);
            qNum++;
        }
    }
    return entries;
}

// Generate pending financial transactions for a confirmed rental
async function generateRentalPayments(event) {
    const { id: eventId, propertyId, clientId, startDate, endDate,
            rentalPeriod, agreedPrice, cleaningFee } = event;

    // Idempotency: skip if payments already exist for this event
    const existingPayments = await getRows('Payments');
    if (existingPayments.some(p => p.eventId === eventId)) {
        console.log(`[generateRentalPayments] Payments already exist for event ${eventId}, skipping.`);
        return;
    }

    const properties = await getRows('Properties');
    const property   = properties.find(p => p.id === propertyId);
    const depositMonths = parseFloat(property?.depositMonths) || 0;
    const price      = parseFloat(agreedPrice) || 0;
    const cleaning   = parseFloat(String(cleaningFee).replace(/[^0-9.,-]/g,'').replace(',','.')) || 0;

    // 1. Rent entries (one per period unit)
    const rentEntries = buildRentEntries(startDate, endDate, rentalPeriod || 'Mensual', price);
    for (const entry of rentEntries) {
        await addRow('Payments', {
            id: uuidv4(), propertyId, clientId: clientId || '', eventId,
            amount: String(entry.amount), date: entry.dueDate,
            type: 'Ingreso', status: 'Pendiente', description: entry.concept
        });
    }

    // 2. Deposit
    if (depositMonths > 0 && price > 0) {
        await addRow('Payments', {
            id: uuidv4(), propertyId, clientId: clientId || '', eventId,
            amount: String(Math.round(depositMonths * price * 100) / 100),
            date: startDate, type: 'Ingreso', status: 'Pendiente', description: 'Depósito'
        });
    }

    // 3. Final cleaning fee
    if (cleaning > 0) {
        await addRow('Payments', {
            id: uuidv4(), propertyId, clientId: clientId || '', eventId,
            amount: String(cleaning), date: endDate,
            type: 'Ingreso', status: 'Pendiente', description: 'Limpieza Final'
        });
    }

    console.log(`[generateRentalPayments] Created ${rentEntries.length} rent + deposit + cleaning for event ${eventId}`);
}

// Helper to check for overlaps
const checkOverlap = async (propertyId, startDate, endDate, excludeEventId = null, existingEvents = null) => {
    const events = existingEvents || await getRows('Events');
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return events.some(ev => {
        if (ev.propertyId !== propertyId) return false;
        if (excludeEventId && ev.id === excludeEventId) return false;
        if (ev.status === 'Cancelado') return false;
        const evStart = new Date(ev.startDate).getTime();
        const evEnd = new Date(ev.endDate).getTime();
        return (start <= evEnd && end >= evStart);
    });
};

// Helper to sync property status
const syncPropertyStatus = async (propertyId, existingEvents = null) => {
    const events = existingEvents || await getRows('Events');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const activeEvent = events.find(ev => {
        if (ev.propertyId !== propertyId) return false;
        if (ev.status === 'Cancelado' || ev.status === 'Completado') return false;
        const start = new Date(ev.startDate).getTime();
        const end = new Date(ev.endDate).getTime();
        return (todayTime >= start && todayTime <= end);
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

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin.' });
        }

        const events = await getRows('Events');

        if (type === 'Alquiler' || type === 'Mantenimiento') {
            const hasOverlap = await checkOverlap(propertyId, startDate, endDate, null, events);
            if (hasOverlap) {
                return res.status(409).json({ message: 'La propiedad ya está ocupada en esas fechas.' });
            }
        }

        const newEvent = { id: uuidv4(), ...req.body };
        await addRow('Events', newEvent);

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
        const newStatus = req.body.status;

        if (!propertyId) {
            return res.status(400).json({ message: 'propertyId es obligatorio' });
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin.' });
        }

        const events = await getRows('Events');

        // Capture previous status BEFORE update (for transition detection)
        const prevEvent = events.find(e => e.id === id);
        const prevStatus = prevEvent?.status;

        if ((type === 'Alquiler' || type === 'Mantenimiento') && startDate && endDate) {
            const hasOverlap = await checkOverlap(propertyId, startDate, endDate, id, events);
            if (hasOverlap) {
                return res.status(409).json({ message: 'La propiedad ya está ocupada en esas fechas (conflicto).' });
            }
        }

        const updated = await updateRow('Events', id, req.body);
        if (updated) {
            await syncPropertyStatus(propertyId);

            // Auto-generate financial transactions on transition → Confirmado (Alquiler only)
            const isAlquiler = (type || prevEvent?.type) === 'Alquiler';
            const justConfirmed = prevStatus !== 'Confirmado' && newStatus === 'Confirmado';
            if (isAlquiler && justConfirmed) {
                // Merge event data: use updated fields falling back to previous
                const fullEvent = { ...prevEvent, ...req.body, id };
                await generateRentalPayments(fullEvent).catch(err =>
                    console.error('[generateRentalPayments] Error:', err.message)
                );
            }

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

        const remainingEvents = events.filter(e => e.id !== id);
        await syncPropertyStatus(propertyId, remainingEvents);

        res.json({ message: 'Event deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting event' });
    }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
