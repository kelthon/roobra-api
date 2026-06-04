import { Duration } from 'luxon';

export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: Duration.fromObject({ minutes: 15 }).as('seconds') || 900,
  },
  refreshToken: {
    length: 64,
    expiresIn: Duration.fromObject({ days: 7 }).as('seconds') || 604800,
  },
});
