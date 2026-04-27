const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');

const SHEET = 'CleaningSchedule';

/**
 * Get all cleaning schedule assignments
 */
const getSchedule = async (req, res) => {
    try {
        const schedule = await getRows(SHEET);
        res.json(schedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching cleaning schedule' });
    }
};

/**
 * Generate an auto-assignment proposal using round-robin.
 * Does NOT save — just returns the proposal for the frontend to review/edit.
 */
const generateProposal = async (req, res) => {
    try {
        const [properties, cleaners, existingSchedule] = await Promise.all([
            getRows('Properties'),
            getRows('Cleaners'),
            getRows(SHEET)
        ]);

        const eligibleProperties = properties.filter(
            p => p.cleaningService && p.cleaningService !== 'Ninguno' && p.cleaningService !== ''
        );

        if (eligibleProperties.length === 0) {
            return res.json({ proposal: [], message: 'No hay propiedades con servicio de limpieza activo.' });
        }

        const activeCleaners = cleaners.filter(c => c.status === 'Activo');

        if (activeCleaners.length === 0) {
            return res.status(400).json({ message: 'No hay personal de limpieza activo. Da de alta al menos uno.' });
        }

        const existingMap = new Map();
        existingSchedule.forEach(s => existingMap.set(s.propertyId, s));

        // Today as default start date
        const today = new Date().toISOString().split('T')[0];

        const proposal = eligibleProperties.map((prop, index) => {
            const existing = existingMap.get(prop.id);

            if (existing) {
                return {
                    id: existing.id,
                    propertyId: prop.id,
                    propertyAddress: prop.address,
                    cleanerId: existing.cleanerId,
                    frequency: prop.cleaningService,
                    dayOfWeek: existing.dayOfWeek || 'Lunes',
                    startDate: existing.startDate || today,
                    endDate: existing.endDate || '',
                    status: existing.status || 'Activo',
                    notes: existing.notes || '',
                    isExisting: true
                };
            }

            const assignedCleaner = activeCleaners[index % activeCleaners.length];
            return {
                id: uuidv4(),
                propertyId: prop.id,
                propertyAddress: prop.address,
                cleanerId: assignedCleaner.id,
                frequency: prop.cleaningService,
                dayOfWeek: prop.cleaningService === 'Mensual' ? '1' :
                           (prop.cleaningService === 'Semanal' || prop.cleaningService === 'Quincenal') ? 'Lunes' : 'Todos',
                startDate: today,
                endDate: '',
                status: 'Activo',
                notes: '',
                isNew: true
            };
        });

        res.json({ proposal, cleaners: activeCleaners });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating cleaning proposal' });
    }
};

/**
 * Save/update the cleaning schedule (batch).
 */
const saveSchedule = async (req, res) => {
    try {
        const { assignments } = req.body;

        if (!assignments || !Array.isArray(assignments)) {
            return res.status(400).json({ message: 'Se requiere un array de asignaciones' });
        }

        const existingSchedule = await getRows(SHEET);
        const existingIds = new Set(existingSchedule.map(s => s.id));

        const results = [];

        for (const assignment of assignments) {
            const data = {
                id: assignment.id,
                propertyId: assignment.propertyId,
                cleanerId: assignment.cleanerId,
                frequency: assignment.frequency,
                dayOfWeek: assignment.dayOfWeek || 'Lunes',
                startDate: assignment.startDate || '',
                endDate: assignment.endDate || '',
                status: assignment.status || 'Activo',
                notes: assignment.notes || ''
            };

            if (existingIds.has(assignment.id)) {
                await updateRow(SHEET, assignment.id, data);
                results.push({ ...data, action: 'updated' });
            } else {
                await addRow(SHEET, data);
                results.push({ ...data, action: 'created' });
            }
        }

        res.json({ message: `${results.length} asignación(es) guardadas.`, results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving cleaning schedule' });
    }
};

/**
 * Update a single assignment
 */
const updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const data = {
            cleanerId: req.body.cleanerId,
            frequency: req.body.frequency,
            dayOfWeek: req.body.dayOfWeek || 'Lunes',
            startDate: req.body.startDate || '',
            endDate: req.body.endDate || '',
            status: req.body.status || 'Activo',
            notes: req.body.notes || ''
        };

        const updated = await updateRow(SHEET, id, data);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Assignment not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};

/**
 * Delete a single assignment
 */
const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await deleteRow(SHEET, id);
        if (deleted) res.json({ message: 'Assignment deleted' });
        else res.status(404).json({ message: 'Assignment not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting assignment' });
    }
};

/**
 * Create a single assignment
 */
const createAssignment = async (req, res) => {
    try {
        const { propertyId, cleanerId, frequency, dayOfWeek, startDate, endDate, status, notes } = req.body;

        if (!propertyId || !cleanerId) {
            return res.status(400).json({ message: 'Propiedad y limpiador son obligatorios' });
        }

        const data = {
            id: uuidv4(),
            propertyId,
            cleanerId,
            frequency: frequency || 'Semanal',
            dayOfWeek: dayOfWeek || 'Lunes',
            startDate: startDate || new Date().toISOString().split('T')[0],
            endDate: endDate || '',
            status: status || 'Activo',
            notes: notes || ''
        };

        await addRow(SHEET, data);
        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating assignment' });
    }
};

module.exports = { getSchedule, generateProposal, saveSchedule, updateAssignment, deleteAssignment, createAssignment };
