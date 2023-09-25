import express from 'express';
import { profileSettingsController } from '../controllers/profileSettings';

const router = express.Router();
router.get('/profile-settings/userId/:userId', profileSettingsController.get);
router.put('/profile-settings/userId/:userId', profileSettingsController.set);

export default router;
