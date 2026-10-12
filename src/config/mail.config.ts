export default () => ({
  mail: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    // Implicit TLS on 465 only; other ports start in plain text and upgrade
    // with STARTTLS when the server offers it
    secure: Number(process.env.EMAIL_PORT) === 465,
    from: process.env.EMAIL_FROM,
  },
});
