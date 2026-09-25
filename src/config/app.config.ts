export default () => ({
  app: {
    mode: process.env.NODE_ENV,
    // Base URL of the frontend, used to build links sent in emails
    frontendUrl: process.env.FRONTEND_URL,
  },
});
