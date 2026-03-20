try {
  process.loadEnvFile();
} catch (e) {
  // Ignore, as it might not exist in production
}
