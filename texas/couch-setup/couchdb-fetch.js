const fs = require('fs');
const request = require('request-promise');

/*
 * Dumps all dbs/docs from couchdb at the specified url.
 * No assumptions are made about the specified directory.
 * 
 * @params url the url of the couchdb (e.g. http://texas.ct-a.ws:5984/)
 * @params dir the dir to store the dump in
 */
async function dump(url, dir) {

  // if directory does not exist, make one to store the dump
  if(!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  // request all couch dbs from the specified url
  const allDbs = JSON.parse(await request(`${url}/_all_dbs`));

  for(i in allDbs) {
    const dbName = allDbs[i];

    // request all documents for the specified database
    request(`${url}/${dbName}/_all_docs?include_docs=true`)
      .then(doc => {

        // write document to a file in the specified folder
        fs.writeFile(`${dir}/${dbName}`, doc, 'utf8', (err) => {
          if(err) throw err;
          console.log(`saved file: ${dbName}`);
        })  
      });
  }
}

dump('http://texas.ct-a.ws:5984/', 'db');