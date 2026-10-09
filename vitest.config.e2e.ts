import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // The e2e specs boot AppModule, which validates the environment at
    // startup. These values pass that validation without a .env file (CI has
    // none) and win over a local one, so every run sees the same config. The
    // specs never reach a query or send an email, so nothing here is contacted.
    env: {
      DATABASE_USER: 'roobra',
      DATABASE_PASSWORD: 'roobra',
      DATABASE_HOST: 'localhost',
      DATABASE_NAME: 'roobra_e2e',
      DATABASE_URL: 'postgresql://roobra:roobra@localhost:5432/roobra_e2e',
      JWT_SECRET:
        'ZTJlLW9ubHktand0LXNlY3JldC1ub3QtdXNlZC1hbnl3aGVyZS1lbHNlISE=',
      COOKIE_SECRET:
        'ZTJlLW9ubHktY29va2llLXNlY3JldC1ub3QtdXNlZC1hbnl3aGVyZS1lbHNl',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PASSWORD: 'roobra',
      EMAIL_HOST: 'localhost',
      EMAIL_USER: 'roobra',
      EMAIL_PASSWORD: 'roobra',
      EMAIL_FROM: '"Roobra" <no-reply@roobra.test>',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
});
