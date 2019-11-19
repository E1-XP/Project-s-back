export default {
  originURL:
    process.env.NODE_ENV === 'production'
      ? 'https://project-s.netlify.com'
      : 'http://localhost:8080',
};
