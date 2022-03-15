import express from 'express';
import actCompletion from '../actCompletion';

const router = express.Router();
router.get('/act-completion', actCompletion.get);
router.get('/act-completion/:customerId', actCompletion.get);

export default router;
