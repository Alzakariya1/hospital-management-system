require('dotenv').config();
const app = require('../src/server');
const routes = [];
function walk(stack, prefix=''){
  for(const layer of stack){
    if(layer.route){
      const methods = Object.keys(layer.route.methods).map(x=>x.toUpperCase()).join(',');
      routes.push(`${methods} ${prefix}${layer.route.path}`);
    } else if(layer.name==='router' && layer.handle?.stack){
      const path = layer.regexp?.source?.replace('^\\/','/').replace('\\/?(?=\\/|$)','').replace(/\\\//g,'/').replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g,':param') || '';
      walk(layer.handle.stack, prefix + (path==='^\\/?(?=\\/|$)'?'':path));
    }
  }
}
walk(app._router.stack);
const required = ['/api/auth/login','/api/patients','/api/doctors','/api/appointments','/api/pharmacy/medicines','/api/inventory/suppliers','/api/lab/templates','/api/compliance/consents','/api/fhir/Patient','/api/command-center/summary','/api/health/live','/api/health/ready'];
const missing = required.filter(r=>!routes.some(x=>x.includes(r)));
console.log(`QA smoke route inventory: ${routes.length} routes loaded`);
if(missing.length){ console.error('Missing critical routes:', missing); process.exit(1); }
console.log('V37 QA smoke passed: critical route surface is present.');
