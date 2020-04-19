export default {
  originURL:
    process.env.NODE_ENV === 'production'
      ? 'https://project-s.netlify.app'
      : 'http://localhost:8080',
};
