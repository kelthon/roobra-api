import { Duration } from 'luxon';

export default () => ({
  passwordResetToken: {
    length: 64,
    expiresIn: Duration.fromObject({ minutes: 30 }).as('seconds'),
  },
});
