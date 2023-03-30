import { Action } from './../../../../../libs/util-api-types/src/lib/crmDataTypes';
import { checkPermissionsMW } from '../middlewares/permissionMiddleware';
import express from 'express';
import permApi from './api/permissions';
import perm from '../handlers/permissions';

const router = express.Router();
router.get('/permissions/actions', perm.getActions);
router.get('/permissions/actions/:actionCode/byUser/:userID', perm.getPermissionByUser);
router.get('/permissions', perm.getCross);
router.use('/permissions', checkPermissionsMW(Action.PermissionsSettings), permApi);


export default router;
