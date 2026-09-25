import { z } from 'zod';

/**
 * A non-blank string. A blank entry (`KEY=`) arrives as `''`, not
 * `undefined`, so a plain `z.string()` would accept it.
 */
const requiredString = () => z.string().trim().min(1);

/**
 * A TCP port. A blank entry coerces to `0` and fails here instead of falling
 * back to the field's default.
 */
const port = () => z.coerce.number().int().min(1).max(65535);

/** At least 32 random bytes in base64, as `openssl rand -base64 32` prints. */
const secret = () => z.base64().min(44);

const DISPLAY_NAME_ADDRESS = /^(?:"[^"]*"|[^"<>]*)\s*<([^<>]+)>$/;

/**
 * A sender in either form nodemailer accepts: `no-reply@roobra.com` or
 * `"Roobra" <no-reply@roobra.com>`. Only the address is validated.
 */
const mailbox = () =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        z.email().safeParse(value.match(DISPLAY_NAME_ADDRESS)?.[1] ?? value)
          .success,
      { message: 'Invalid email address' },
    );

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1024).max(49151).default(3000),

  DATABASE_USER: requiredString(),
  DATABASE_PASSWORD: requiredString(),
  DATABASE_HOST: requiredString(),
  DATABASE_PORT: port().default(5432),
  DATABASE_NAME: requiredString(),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  JWT_SECRET: secret(),
  COOKIE_SECRET: secret(),

  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  REDIS_PASSWORD: requiredString(),

  EMAIL_HOST: requiredString(),
  EMAIL_PORT: port().default(587),
  EMAIL_USER: requiredString(),
  EMAIL_PASSWORD: requiredString(),
  EMAIL_FROM: mailbox(),

  FRONTEND_URL: z.url({ protocol: /^https?$/ }),
});

export type EnvDto = z.infer<typeof EnvSchema>;
