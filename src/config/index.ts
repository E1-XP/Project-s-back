export default {
  originURL:
    process.env.NODE_ENV === 'production'
      ? process.env.ORIGIN_URL
      : 'http://localhost:8080',
};
