export default () => ({
  mail: {
    host: process.env.EMAIL_HOST || 'localhost',
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    // SMTP over TLS on the implicit port (465) vs. STARTTLS (587/25)
    secure: Number(process.env.EMAIL_PORT) === 465,
    from: process.env.EMAIL_FROM || 'Roobra <no-reply@roobra.com>',
  },
});
