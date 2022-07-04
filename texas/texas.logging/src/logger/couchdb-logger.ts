import * as nano from 'nano';
import { Observable, Subscription } from 'rxjs';

const couchAdminUsername =  process.env.adminUsername;
const couchAdminPassword = process.env.adminPassword;
const releaseName = process.env.RELEASE_NAME;
const namespace =  process.env.NAMESPACE;

const couchdbAddress: string = `http://${couchAdminUsername}:${couchAdminPassword}@${releaseName}-couchdb.${namespace}.svc.cluster.local:5984`;

// Note: CouchDB names must be lowercase.
const couchdbTracksName: string = "tracksamqp";
const couchdbControlName: string = "controlamqp";

export class CouchdbLogger {

  private subscriptions: Subscription;

  constructor(
    private tracks$: Observable<any>,
    private control$: Observable<any>
  ) {
    console.log("COUCHDB: Connecting on " + couchdbAddress);
    const server = nano({url: couchdbAddress});

    if (server.db === undefined) {
      console.log('COUCHDB: Failed to connect to database');
      process.exit(1);
    }

    Promise.all([
      this.createDatabaseIfNotPresent(server, couchdbTracksName),
      this.createDatabaseIfNotPresent(server, couchdbControlName)
    ]).then((results: boolean[]) => {
      if (!results.every(r => r)) {
        process.exit(1);
      }

      this.subscriptions = this.tracks$.subscribe((track: any) => {
        server.db.use(couchdbTracksName).insert(track, null, (_err: any, _response: any) => {
          // console.log("COUCHDB: Track added: " + JSON.stringify(track));
        });
      });

      this.subscriptions = this.control$.subscribe((control: any) => {
        server.db.use(couchdbControlName).insert(control, null, (_err: any, _response: any) => {
          // console.log("COUCHDB: Control added: " + JSON.stringify(control));
        });
      });
    }).catch(e => {
      console.error(e);
      process.exit(1);
    });
  }

  close() {
    this.subscriptions.unsubscribe();
  }

  private createDatabaseIfNotPresent(server: nano.ServerScope, dbName: string): Promise<boolean> {
    return server.db.get(dbName).then((_value: nano.DatabaseGetResponse) => {
      console.log('COUCHDB: Found database: ' + dbName);
      return true;
    }, (rejection: any) => {
      if (rejection.headers.statusCode == 404) {
        // database doesn't exist, need to create
        return server.db.create(dbName).then((_response: nano.DatabaseCreateResponse) => {
          console.log('COUCHDB: Created database: ' + dbName);
          return true;
        }, (rejectedReason: any) => {
          console.error('COUCHDB: Failed to create database: ' + dbName);
          console.error(rejectedReason);
          return false;
        });
      }
    });
  }
}
