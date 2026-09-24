import { Duration } from 'luxon';

export default () => ({
  emailVerificationToken: {
    length: 64,
    expiresIn: Duration.fromObject({ hours: 24 }).as('seconds'),
  },
});
