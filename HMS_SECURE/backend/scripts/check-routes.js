process.env.JWT_SECRET = process.env.JWT_SECRET || 'local_route_check_secret_value_please_change';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
require('../src/server');
console.log('Backend routes loaded successfully.');
