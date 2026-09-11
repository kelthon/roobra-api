export default () => ({
  throttler: {
    default: {
      ttl: 60_000,
      limit: 20,
    },
  },
});
