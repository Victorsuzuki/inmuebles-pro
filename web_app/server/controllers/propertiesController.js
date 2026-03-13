const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');
const { uploadToFirebase, deleteFirebaseFile } = require('../services/firebaseService');

const getProperties = async (req, res) => {
    try {
        const properties = await getRows('Properties');
        // Filter out archived unless explicitly requested
        const showArchived = req.query.archived === 'true';
        // Case-insensitive archived check
        const filtered = showArchived ? properties : properties.filter(p =>
            String(p.archived || '').toLowerCase() !== 'true'
        );
        res.json(filtered);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching properties' });
    }
};

const getAllProperties = async (req, res) => {
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
            status: 'Disponible',
            archived: 'false'
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

// Archive a property
const archiveProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await updateRow('Properties', id, { archived: 'true' });
        if (updated) res.json({ message: 'Propiedad archivada', data: updated });
        else res.status(404).json({ message: 'Property not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error archiving property' });
    }
};

// Unarchive a property
const unarchiveProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await updateRow('Properties', id, { archived: 'false' });
        if (updated) res.json({ message: 'Propiedad desarchivada', data: updated });
        else res.status(404).json({ message: 'Property not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error unarchiving property' });
    }
};

// Delete property with all dependencies (cascade)
const deletePropertyCascade = async (req, res) => {
    try {
        const { id } = req.params;
        let deleted = { events: 0, payments: 0, schedule: 0, photos: 0, property: false };

        // Delete events
        const events = await getRows('Events');
        for (const ev of events.filter(e => e.propertyId === id)) {
            await deleteRow('Events', ev.id);
            deleted.events++;
        }

        // Delete payments
        const payments = await getRows('Payments');
        for (const pay of payments.filter(p => p.propertyId === id)) {
            await deleteRow('Payments', pay.id);
            deleted.payments++;
        }

        // Delete cleaning schedule entries
        const schedule = await getRows('CleaningSchedule');
        for (const s of schedule.filter(s => s.propertyId === id)) {
            await deleteRow('CleaningSchedule', s.id);
            deleted.schedule++;
        }

        // Delete photos from drive and sheet
        const photos = await getRows('PropertyPhotos');
        for (const photo of photos.filter(p => p.propertyId === id)) {
            if (photo.driveFileId) await deleteFile(photo.driveFileId);
            await deleteRow('PropertyPhotos', photo.id);
            deleted.photos++;
        }

        // Delete dossier from drive
        const properties = await getRows('Properties');
        const prop = properties.find(p => p.id === id);
        if (prop?.dossierFileId) {
            await deleteFile(prop.dossierFileId);
        }

        // Delete property itself
        deleted.property = await deleteRow('Properties', id);

        res.json({
            message: `Propiedad eliminada con ${deleted.events} evento(s), ${deleted.payments} pago(s), ${deleted.schedule} programación(es), ${deleted.photos} foto(s).`,
            deleted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting property' });
    }
};

// Simple delete (legacy — blocks if has events)
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const events = await getRows('Events');
        const associatedEvents = events.filter(ev => ev.propertyId === id);

        if (associatedEvents.length > 0) {
            return res.status(409).json({
                message: `No se puede eliminar: la propiedad tiene ${associatedEvents.length} evento(s) asociado(s). Usa eliminación en cascada.`
            });
        }

        const deleted = await deleteRow('Properties', id);
        if (deleted) res.json({ message: 'Property deleted' });
        else res.status(404).json({ message: 'Property not found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting property' });
    }
};

// Upload photos
const uploadPhotos = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No se han proporcionado archivos' });
        }

        const existingPhotos = await getRows('PropertyPhotos');
        const maxOrder = existingPhotos
            .filter(p => p.propertyId === id)
            .reduce((max, p) => Math.max(max, parseInt(p.order) || 0), 0);

        const results = [];
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const result = await uploadToFirebase(
                file.buffer,
                `prop_${id}_${Date.now()}_${i}${getExtension(file.originalname)}`,
                file.mimetype,
                `properties/${id}`
            );

            const photoData = {
                id: uuidv4(),
                propertyId: id,
                driveFileId: result.fileId, // Keeping column naming for compatibility
                driveUrl: result.webViewLink,
                caption: '',
                order: String(maxOrder + i + 1)
            };

            await addRow('PropertyPhotos', photoData);
            results.push(photoData);
        }

        res.status(201).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading photos' });
    }
};

// Get photos for a property
const getPhotos = async (req, res) => {
    try {
        const { id } = req.params;
        const photos = await getRows('PropertyPhotos');
        const propertyPhotos = photos
            .filter(p => p.propertyId === id)
            .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
        res.json(propertyPhotos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching photos' });
    }
};

// Delete a photo
const deletePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const photos = await getRows('PropertyPhotos');
        const photo = photos.find(p => p.id === photoId);

        if (!photo) return res.status(404).json({ message: 'Photo not found' });

        if (photo.driveFileId) await deleteFirebaseFile(photo.driveFileId);
        await deleteRow('PropertyPhotos', photoId);

        res.json({ message: 'Photo deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting photo' });
    }
};

// Upload dossier PDF
const uploadDossier = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha proporcionado un archivo' });
        }

        // Delete existing dossier if present
        const properties = await getRows('Properties');
        const prop = properties.find(p => p.id === id);
        if (prop?.dossierFileId) {
            await deleteFirebaseFile(prop.dossierFileId);
        }

        const result = await uploadToFirebase(
            req.file.buffer,
            `dossier_${id}_${Date.now()}.pdf`,
            'application/pdf',
            `properties/${id}`
        );

        await updateRow('Properties', id, {
            dossierUrl: result.webViewLink,
            dossierFileId: result.fileId
        });

        res.json({
            dossierUrl: result.webViewLink,
            dossierFileId: result.fileId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading dossier' });
    }
};

function getExtension(filename) {
    const ext = filename.lastIndexOf('.');
    return ext >= 0 ? filename.substring(ext) : '';
}

module.exports = {
    getProperties, getAllProperties, createProperty, updateProperty, deleteProperty,
    archiveProperty, unarchiveProperty, deletePropertyCascade,
    uploadPhotos, getPhotos, deletePhoto, uploadDossier
};
