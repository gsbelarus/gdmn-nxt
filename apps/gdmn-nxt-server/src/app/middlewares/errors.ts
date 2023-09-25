import { NextFunction, Response } from 'express';
import { Request } from 'express-jwt';
import { resultError } from '../responseMessages';
import { ERROR_MESSAGES } from '../constants/messages';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json(resultError(ERROR_MESSAGES.AUTH_FAILED));
  }
  next(err);
};
