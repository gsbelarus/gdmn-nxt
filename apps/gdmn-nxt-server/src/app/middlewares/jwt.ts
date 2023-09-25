import { config } from '@gdmn-nxt/config';
import { expressjwt } from 'express-jwt';

export const jwtMiddleware = expressjwt({
  secret: config.jwtSecret,
  algorithms: ['HS256'],
  getToken: req => req.session.token,
  onExpired: (req, err) => {
    console.log('[ jwt ] Token has expired');
    req.logout((error) => {
      if (error) console.error(error);;
    });
  },
});
