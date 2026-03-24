const express = require('express');
const router = express.Router();
const multer = require('multer');
const propertiesController = require('../controllers/propertiesController');
const { authenticate } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'application/pdf',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.use(authenticate);

// Properties CRUD
router.get('/', propertiesController.getProperties);
router.get('/all', propertiesController.getAllProperties); // includes archived
router.post('/', propertiesController.createProperty);
router.put('/:id', propertiesController.updateProperty);
router.delete('/:id', propertiesController.deleteProperty);
router.delete('/:id/cascade', propertiesController.deletePropertyCascade);

// Archive/Unarchive
router.put('/:id/archive', propertiesController.archiveProperty);
router.put('/:id/unarchive', propertiesController.unarchiveProperty);

// Photos
router.get('/:id/photos', propertiesController.getPhotos);
router.post('/:id/photos', upload.array('photos', 50), propertiesController.uploadPhotos);
router.delete('/:id/photos/:photoId', propertiesController.deletePhoto);

// Dossier PDF (legacy small-file route kept for compatibility)
router.post('/:id/dossier', upload.single('dossier'), propertiesController.uploadDossier);

// Signed upload URL flow (bypasses API Gateway 10 MB limit)
router.get('/:id/dossier-upload-url', propertiesController.getDossierUploadUrl);
router.post('/:id/dossier-confirm', propertiesController.confirmDossierUpload);

// Chunked upload flow (each chunk is base64 JSON < 10 MB; no CORS config needed)
router.post('/:id/dossier-chunk', propertiesController.uploadDossierChunk);

module.exports = router;
