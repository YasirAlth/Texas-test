const fs = require('fs');
const request = require('request-promise');

/*
 * Puts all dbs/docs from a folder into couchdb at the specified url.
 * It is assumed that the directory was produced using the 
 * 'couchdb-fetch.js' script.
 * 
 * @params url the url of the couchdb (e.g. http://localhost:5984/)
 * @params dir the dir to read the db/docs from
 */
async function putSync(url, dir, dbs, replace = true) {
  const files = fs.readdirSync(dir);
  for (file of files) {
    if (dbs.find(v => v === file)) {
      if (replace) {
        // Delete the database -- if it exists
        try {
          let result = await request({
            url: `${url}/${file}`,
            method: 'DELETE',
            rejectUnauthorized: false
          });
          console.log(`Deleted database: ${file}`);
        } catch (err) {
          console.log(`ERROR: ${err}`);
        }
      }
      // Create the database -- if it doesn't exist
      try {
        let result = await request({
          url: `${url}/${file}`,
          method: 'PUT',
          json: file,
          rejectUnauthorized: false
        });
        console.log(`Created database: ${file}`);
      } catch (err) {
        console.log(`ERROR: ${err}`);
      }
      // Add the documents
      const db = JSON.parse(fs.readFileSync(`${dir}/${file}`));
      const docs = []
      for (row of db.rows) {
        // Remove the revision
        if(row.hasOwnProperty('doc')) {
          delete row.doc._rev;
          try {
            docs.push(row.doc);
          } catch (err) {
            console.log(`ERROR: ${err}`);
          }
        } else {
          docs.push(row);
        }
      }

      console.log(docs);

      const reqUrl = `${url}/${file}/_bulk_docs`;
      let result = await request({
        url: reqUrl,
        method: 'POST',
        body: {"docs": docs}, // the document
        rejectUnauthorized: false,
        headers: {
          'Content-Type': ' application/json'
        },

        encoding: 'latin1',
        json: true
      });
    }
  }
}

const couchAdminUsername =  process.env.adminUsername;
const couchAdminPassword = process.env.adminPassword;
const releaseName = process.env.RELEASE_NAME;
const namespace =  process.env.NAMESPACE;
const couchdbAddress = "http://" + couchAdminUsername + ":" + couchAdminPassword + "@" + releaseName + "-couchdb." + namespace + ".svc.cluster.local:5984";

// Note because it is async the docs may not be added in the order they were added...
putSync(couchdbAddress, 'db', ['alertsamqp', 'controlamqp', 'tracksamqp', 'mission-data', 'incident-reports']);
