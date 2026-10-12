import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter.js';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

export const mailerOptionsFactory = (config: ConfigService): MailerOptions => ({
  defaults: {
    from: config.getOrThrow<string>('mail.from'),
  },
  transports: {
    smtp: {
      host: config.getOrThrow<string>('mail.host'),
      port: config.getOrThrow<number>('mail.port'),
      secure: config.getOrThrow<boolean>('mail.secure'),
      auth: {
        user: config.getOrThrow<string>('mail.user'),
        pass: config.getOrThrow<string>('mail.password'),
      },
    },
  },
  template: {
    dir: join(import.meta.dirname, '..', 'templates'),
    adapter: new HandlebarsAdapter(undefined, {
      inlineCssEnabled: true,
    }),
    options: {
      strict: true,
    },
  },
  i18n: {
    defaultLocale: 'en',
    templateDirPattern: 'locales/{{locale}}/',
    fallback: true,
  },
  options: {
    partials: {
      dir: join(import.meta.dirname, '..', 'templates', 'partials'),
      options: { strict: true },
    },
    layout: 'layouts/main',
  },
  preview: config.getOrThrow('app.mode') !== 'production' && {
    open: true,
  },
});
