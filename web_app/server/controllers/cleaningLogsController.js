const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow } = require('../services/sheetService');

const SHEET = 'CleaningLogs';

/**
 * Get logs for a specific cleaner (used by the cleaner portal)
 */
const getMyLogs = async (req, res) => {
    try {
        const cleanerId = req.query.cleanerId || req.user?.cleanerId;
        if (!cleanerId) {
            return res.status(400).json({ message: 'cleanerId es obligatorio' });
        }

        const logs = await getRows(SHEET);
        const myLogs = logs.filter(l => l.cleanerId === cleanerId);

        // Sort by date descending
        myLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        res.json(myLogs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching cleaning logs' });
    }
};

/**
 * Get all logs (for supervisors/reports)
 */
const getAllLogs = async (req, res) => {
    try {
        const logs = await getRows(SHEET);
        const { from, to, cleanerId, propertyId } = req.query;

        let filtered = logs;

        if (from) filtered = filtered.filter(l => l.date >= from);
        if (to) filtered = filtered.filter(l => l.date <= to);
        if (cleanerId) filtered = filtered.filter(l => l.cleanerId === cleanerId);
        if (propertyId) filtered = filtered.filter(l => l.propertyId === propertyId);

        filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        res.json(filtered);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching cleaning logs' });
    }
};

/**
 * Log entry time (cleaner starts work)
 */
const logEntry = async (req, res) => {
    try {
        const { scheduleId, cleanerId, propertyId } = req.body;

        if (!cleanerId || !propertyId) {
            return res.status(400).json({ message: 'cleanerId y propertyId son obligatorios' });
        }

        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

        const logData = {
            id: uuidv4(),
            scheduleId: scheduleId || '',
            cleanerId,
            propertyId,
            date,
            entryTime: time,
            exitTime: '',
            observations: '',
            status: 'En curso'
        };

        await addRow(SHEET, logData);
        res.status(201).json(logData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering entry' });
    }
};

/**
 * Log exit time + observations (cleaner ends work)
 */
const logExit = async (req, res) => {
    try {
        const { id } = req.params;
        const { observations } = req.body;

        const now = new Date();
        const time = now.toTimeString().split(' ')[0].substring(0, 5);

        const updated = await updateRow(SHEET, id, {
            exitTime: time,
            observations: observations || '',
            status: 'Completado'
        });

        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Log not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering exit' });
    }
};

/**
 * Report: hours per cleaner in a period
 */
const getHoursReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        const logs = await getRows(SHEET);
        const cleaners = await getRows('Cleaners');

        let filtered = logs.filter(l => l.status === 'Completado' && l.entryTime && l.exitTime);
        if (from) filtered = filtered.filter(l => l.date >= from);
        if (to) filtered = filtered.filter(l => l.date <= to);

        // Calculate hours per cleaner
        const cleanerMap = new Map();
        cleaners.forEach(c => cleanerMap.set(c.id, c.name));

        const report = {};
        filtered.forEach(log => {
            if (!report[log.cleanerId]) {
                report[log.cleanerId] = {
                    cleanerId: log.cleanerId,
                    cleanerName: cleanerMap.get(log.cleanerId) || 'Desconocido',
                    totalMinutes: 0,
                    sessions: 0
                };
            }

            // Parse HH:MM times
            const [eh, em] = log.entryTime.split(':').map(Number);
            const [xh, xm] = log.exitTime.split(':').map(Number);
            const entryMinutes = eh * 60 + em;
            const exitMinutes = xh * 60 + xm;
            const duration = exitMinutes - entryMinutes;

            if (duration > 0) {
                report[log.cleanerId].totalMinutes += duration;
                report[log.cleanerId].sessions += 1;
            }
        });

        // Convert to array and format hours
        const result = Object.values(report).map(r => ({
            ...r,
            totalHours: (r.totalMinutes / 60).toFixed(1),
            avgMinutesPerSession: r.sessions > 0 ? Math.round(r.totalMinutes / r.sessions) : 0
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating hours report' });
    }
};

/**
 * Report: observations/notes per period
 */
const getNotesReport = async (req, res) => {
    try {
        const { from, to, cleanerId, propertyId } = req.query;
        const logs = await getRows(SHEET);
        const cleaners = await getRows('Cleaners');
        const properties = await getRows('Properties');

        const cleanerMap = new Map();
        cleaners.forEach(c => cleanerMap.set(c.id, c.name));
        const propMap = new Map();
        properties.forEach(p => propMap.set(p.id, p.address));

        let filtered = logs.filter(l => l.observations && l.observations.trim() !== '');
        if (from) filtered = filtered.filter(l => l.date >= from);
        if (to) filtered = filtered.filter(l => l.date <= to);
        if (cleanerId) filtered = filtered.filter(l => l.cleanerId === cleanerId);
        if (propertyId) filtered = filtered.filter(l => l.propertyId === propertyId);

        filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const result = filtered.map(l => ({
            ...l,
            cleanerName: cleanerMap.get(l.cleanerId) || 'Desconocido',
            propertyAddress: propMap.get(l.propertyId) || 'Desconocida'
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating notes report' });
    }
};

module.exports = { getMyLogs, getAllLogs, logEntry, logExit, getHoursReport, getNotesReport };
