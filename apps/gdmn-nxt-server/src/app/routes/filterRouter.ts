import express from 'express';
import filterApi from './api/filterAPI'

const router = express.Router();
router.use('/filters', filterApi);

export default router;
