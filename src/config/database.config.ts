export default () => ({
  database: {
    name: process.env.DATABASE_NAME || 'roobra',
    user: process.env.USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/roobra',
  },
});
