const admin = require('firebase-admin');
const service_account = require('./firebase-service.json');

const database_url = process.env.DATABASE_URL;

if(!admin.apps.length){
    const config = {
        credential: admin.credential.cert(service_account)
    };
    
    if (database_url) {
        config.databaseURL = database_url;
    }
    
    admin.initializeApp(config);
}


module.exports = {
    admin,
    realtime_db: admin.database(),
    service_db: admin.firestore()
}
