const { v4: uuidv4 } = require('uuid');
const { getRows, addRow, updateRow, deleteRow } = require('../services/sheetService');
const { uploadToFirebase, deleteFirebaseFile, getSignedUploadUrl } = require('../services/firebaseService');
const { GoogleAuth } = require('google-auth-library');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' });
const DOSSIER_BUCKET = process.env.DOSSIER_BUCKET;

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

        // Delete dossier from S3/Firebase
        const properties = await getRows('Properties');
        const prop = properties.find(p => p.id === id);
        if (prop?.dossierFileId) {
            await smartDeleteFile(prop.dossierFileId);
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

// Get a signed upload URL so the frontend can upload the PDF directly to Firebase
// (bypasses API Gateway 10MB limit)
const getDossierUploadUrl = async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = `properties/${id}/dossier_${id}_${Date.now()}.pdf`;
        const result = await getSignedUploadUrl(filePath, 'application/pdf', 15);
        res.json(result); // { signedUrl, publicUrl, fileId }
    } catch (error) {
        console.error('getDossierUploadUrl error:', error);
        res.status(500).json({ message: 'Error generating upload URL' });
    }
};

// Called by frontend AFTER direct upload to Firebase to save the URL to Sheets
const confirmDossierUpload = async (req, res) => {
    try {
        const { id } = req.params;
        const { publicUrl, fileId } = req.body;
        if (!publicUrl || !fileId) {
            return res.status(400).json({ message: 'publicUrl and fileId are required' });
        }

        // Delete old dossier if exists
        const properties = await getRows('Properties');
        const prop = properties.find(p => p.id === id);
        if (prop?.dossierFileId) {
            await smartDeleteFile(prop.dossierFileId);
        }

        await updateRow('Properties', id, {
            dossierUrl: publicUrl,
            dossierFileId: fileId
        });

        res.json({ dossierUrl: publicUrl, dossierFileId: fileId });
    } catch (error) {
        console.error('confirmDossierUpload error:', error);
        res.status(500).json({ message: 'Error saving dossier URL' });
    }
};

// ----- Chunked dossier upload (bypasses API Gateway 10 MB limit) -----
// In-memory store for chunks. Lambda is stateless so we use a simple Map;
// chunks of a single upload must hit the same Lambda instance.
// Each entry: { total, received: Map<index, Buffer> }
const chunkStore = new Map();

const uploadDossierChunk = async (req, res) => {
    try {
        const { id } = req.params;
        // Defensive: API Gateway may pass body as a raw string via serverless-http
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (_) { /* keep as string */ }
        }
        const { chunkIndex, totalChunks, chunkData } = body || {};

        console.log(`[CHUNK] prop=${id} idx=${chunkIndex} total=${totalChunks} dataLen=${chunkData?.length}`);

        if (chunkData === undefined || chunkIndex === undefined || totalChunks === undefined) {
            console.error('[CHUNK] Missing fields. body type:', typeof req.body, 'keys:', Object.keys(body || {}));
            return res.status(400).json({ message: 'Missing chunkIndex, totalChunks or chunkData' });
        }

        const key = id;
        if (!chunkStore.has(key)) {
            chunkStore.set(key, { total: Number(totalChunks), chunks: new Map() });
        }
        const entry = chunkStore.get(key);
        entry.chunks.set(Number(chunkIndex), Buffer.from(chunkData, 'base64'));

        console.log(`[CHUNK] stored idx=${chunkIndex} entry size=${entry.chunks.size}/${entry.total}`);

        // All chunks received?
        if (entry.chunks.size < entry.total) {
            return res.json({ received: entry.chunks.size, total: entry.total, done: false });
        }

        // Assemble
        console.log('[CHUNK] assembling buffer...');
        const ordered = [];
        for (let i = 0; i < entry.total; i++) ordered.push(entry.chunks.get(i));
        const fullBuffer = Buffer.concat(ordered);
        chunkStore.delete(key);
        console.log(`[CHUNK] assembled ${fullBuffer.length} bytes, uploading to Firebase...`);

        // Delete old dossier
        const properties = await getRows('Properties');
        const prop = properties.find(p => p.id === id);
        if (prop?.dossierFileId) {
            await deleteFirebaseFile(prop.dossierFileId);
        }

        // Upload assembled buffer to Firebase
        const result = await uploadToFirebase(
            fullBuffer,
            `dossier_${id}_${Date.now()}.pdf`,
            'application/pdf',
            `properties/${id}`
        );
        console.log('[CHUNK] Firebase upload done:', result.webViewLink);

        await updateRow('Properties', id, {
            dossierUrl: result.webViewLink,
            dossierFileId: result.fileId
        });

        res.json({ done: true, dossierUrl: result.webViewLink });
    } catch (error) {
        console.error('uploadDossierChunk error:', error.message, error.stack);
        res.status(500).json({ message: 'Error processing dossier chunk', detail: error.message });
    }
};

// Generate a short-lived Google OAuth2 token for direct browser upload to Firebase Storage.
// Uses firebasestorage.googleapis.com which has CORS enabled (unlike storage.googleapis.com).
const getDossierToken = async (req, res) => {
    try {
        const { id } = req.params;
        const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
        const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

        const auth = new GoogleAuth({
            credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
            scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
        });
        const token = await auth.getAccessToken();
        const filePath = `properties/${id}/dossier_${id}_${Date.now()}.pdf`;

        res.json({ token, filePath, bucket: BUCKET });
    } catch (error) {
        console.error('getDossierToken error:', error.message);
        res.status(500).json({ message: 'Error generating upload token' });
    }
};
// Generate a presigned S3 PUT URL for direct browser upload (CORS configured on bucket via CloudFormation)
const getDossierS3Url = async (req, res) => {
    try {
        const { id } = req.params;
        const key = `properties/${id}/dossier_${id}_${Date.now()}.pdf`;
        const command = new PutObjectCommand({
            Bucket: DOSSIER_BUCKET,
            Key: key,
            ContentType: 'application/pdf',
        });
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
        const publicUrl = `https://${DOSSIER_BUCKET}.s3.eu-north-1.amazonaws.com/${key}`;
        res.json({ presignedUrl, publicUrl, fileId: key });
    } catch (error) {
        console.error('getDossierS3Url error:', error.message);
        res.status(500).json({ message: 'Error generating S3 upload URL' });
    }
};

const deleteDossier = async (req, res) => {
    try {
        const { id } = req.params;
        const properties = await getRows('Properties');
        const prop = properties.find(p => p.id === id);

        if (prop?.dossierFileId) {
            await smartDeleteFile(prop.dossierFileId);
        }

        const result = await updateRow('Properties', id, {
            dossierUrl: '',
            dossierFileId: ''
        });

        if (!result) {
            console.error(`[deleteDossier] updateRow failed for ID: ${id}`);
            return res.status(404).json({ message: 'Propiedad no encontrada en la hoja' });
        }

        console.log(`[deleteDossier] Success for ID: ${id}`);
        res.json({ message: 'Dossier eliminado correctamente' });
    } catch (error) {
        console.error('deleteDossier error:', error);
        res.status(500).json({ message: 'Error eliminando dossier' });
    }
};

// Internal helper to delete from S3 or Firebase
async function smartDeleteFile(fileId) {
    if (!fileId) return;

    // 1. Try S3 (new dossiers)
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: DOSSIER_BUCKET,
            Key: fileId
        }));
    } catch (err) {
        // If it was not in S3, that's fine, we'll try Firebase next
        console.log(`Note: File ${fileId} not found or error in S3 deletion: ${err.message}`);
    }

    // 2. Try Firebase (legacy dossiers)
    await deleteFirebaseFile(fileId);
}

function getExtension(filename) {
    const ext = filename.lastIndexOf('.');
    return ext >= 0 ? filename.substring(ext) : '';
}

module.exports = {
    getProperties, getAllProperties, createProperty, updateProperty, deleteProperty,
    archiveProperty, unarchiveProperty, deletePropertyCascade,
    uploadPhotos, getPhotos, deletePhoto, uploadDossier,
    getDossierUploadUrl, confirmDossierUpload, uploadDossierChunk, getDossierToken, getDossierS3Url,
    deleteDossier
};
