import express from 'express';
import filter from '../../handlers/filter';

const router = express.Router();

router.get('/deadline', filter.get);
router.get('/deadline/:filterCode', filter.get);
// router.post('/filter', filter.upsert);
// router.put('/filter/:filterCode', filter.upsert);
// router.delete('/filter/:filterCode', filter.remove);

export default router;
