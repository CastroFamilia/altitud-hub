import postgres from 'postgres';

// We use the postgres.js library
// Connection string format: postgres://user:password@host:port/database

const sql = postgres(process.env.DATABASE_URL, {
  // connection options
  max: 10,             // Max number of connections
  idle_timeout: 20,    // Idle connection timeout in seconds
  connect_timeout: 10, // Connect timeout in seconds
  transform: {
    ...postgres.camel, // Automatically camelCase columns returned to JS
    undefined: null    // Treat undefined parameters as null
  }
});

export default sql;
