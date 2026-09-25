export default () => ({
  mail: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    secure: Number(process.env.EMAIL_PORT),
    from: process.env.EMAIL_FROM,
  },
});
