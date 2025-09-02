const admin = require('firebase-admin');
const service_account = require('./firebase-service.json');


const database_url = process.env.DATABASE_URL;

if(!admin.apps.length){
    admin.initializeApp({
        credential: admin.credential.cert(service_account),
        databaseURL: database_url
    });
}


module.exports = {
    admin,
    realtime_db: admin.database(),
    service_db: admin.firestore()
}
