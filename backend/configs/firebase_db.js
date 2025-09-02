const admin = require('firebase-admin');
const service_account = require('./firebase-service.json');

// Use the project ID from the service account to construct the database URL
const database_url = process.env.DATABASE_URL || `https://${service_account.project_id}-default-rtdb.firebaseio.com/`;

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
