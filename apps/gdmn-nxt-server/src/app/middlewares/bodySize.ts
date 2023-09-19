import { RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import sizeof from 'object-sizeof';

export const bodySize: RequestHandler = (req, res, next) => {
  const maxBodySizeMb = 10;
  console.log('asd');
  const bodySizeMb = sizeof(req.body) / 1000000;
  if (bodySizeMb > maxBodySizeMb) return res.status(413).send(resultError('Много'));
  return next();
};
