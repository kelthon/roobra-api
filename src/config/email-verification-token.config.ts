import { Duration } from 'luxon';

export default () => ({
  emailVerificationToken: {
    length: 64,
    expiresIn: Duration.fromObject({ minutes: 15 }).as('seconds'),
  },
});
