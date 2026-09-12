export default () => ({
  app: {
    // Base URL of the frontend, used to build links sent in emails
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
});
