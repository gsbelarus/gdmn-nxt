import express from 'express';
import labels from '../handlers/labels';

const router = express.Router();
router.get('/labels', labels.get);
router.get('/labels/:id', labels.get);
router.post('/labels', labels.upsert);
router.put('/labels/:id', labels.upsert);
router.delete('/labels/:id', labels.remove);

export default router;
