import { Configuration, ServerScope } from 'nano';
import nano = require('nano');
import { Subject, Subscription, BehaviorSubject, Observable } from 'rxjs';
import { isNullOrUndefined } from 'util';

// To ignore the self-signed certificate error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const couchAdminUsername =  process.env.couchdbUsername;
const couchAdminPassword = process.env.couchdbPassword;
const replicaCouchAdminUsername =  process.env.replicaCouchdbUsername;
const replicaCouchAdminPassword = process.env.replicaCouchdbPassword;
const releaseName = process.env.RELEASE_NAME;
const namespace =  process.env.NAMESPACE;

/**
 * This class performs the cloning of the main couchDB to the mirror couchDB instance in TEXAS. It does so by
 * replicating databases from one couchDB instance to another (main couchDB to mirror couchDB).
 *
 * However the replication functionality is at the database scope, hence new databases will need to be manually
 * checked and replication _changes listener will need to be attached to these new databases.
 *
 * This checking will be at a time interval of manualReplicationPollingInterval.
 */

export class Replicator {
  // End-points and user/password details of the couchDB instances for database replication
  // To perform DB replication - source is fromCouchDBAddress and target is toCouchDBAddress
  
  private fromCouchDBAddress: string = `http://${couchAdminUsername}:${couchAdminPassword}@${releaseName}-couchdb.${namespace}.svc.cluster.local:5984`;
  private toCouchDBAddress: string = `http://${replicaCouchAdminUsername}:${replicaCouchAdminPassword}@${releaseName}-replica-couchdb.${namespace}.svc.cluster.local:5984`;

  // Create Nano Configuration objects
  private fromCouchDBConfig: Configuration = {
    url: this.fromCouchDBAddress,
  };

  private toCouchDBConfig: Configuration = {
    url: this.toCouchDBAddress,
  };

  private serverFromCouchDB: ServerScope = null;
  private serverToCouchDB: ServerScope = null;

  // DB replication has been set to continous, however this doesn't cater for new databases added to couchDB, hence
  // we need to manually check for any additional databases at time intervals, and re-run DB replication
  private manualReplicationPollingInterval = 4000; // every 4 seconds

  // Replication will be one way, that is fromCouchDB -> toCouchDB, hence we are only concerned changes to the
  // fromCouchDB (source) couchDB instance
  private _fromCouchDBList: string[] = [];

  // Create a subject and observer to listen for changes
  private dbListSubject: BehaviorSubject<Array<string>> = new BehaviorSubject<
    Array<string>
  >(this._fromCouchDBList);

  private readonly dbListObservable: Observable<
    Array<string>
  > = this.dbListSubject.asObservable();

  constructor() {
    this.dbListSubject.subscribe({
      next: () => {
        console.log('**********dbListSubject function invoked');
        this.runDBReplication();
      },
    });

    // Only after we have succesfully connected to the couchDB instances, retrieve the DB list
    Promise.all([this.connectToCouchDBInstances()])
      .then(() => {
        console.log('**********Connection to couchDB instances complete.');
        // TODO: remove after testing
        // this.runTestFunctions();

        this.resetToCouchDBItems();
        // The following function also caters for triggering a change, and then in effect executing replication
        // In this case, upon first execution, a change will be triggered
        this.getFromCouchDBList();
      })
      .catch(err => {
        console.log('**********Error connecting to the two couchDB instances.');
        console.log(err);
        // Kill the service for it to be restarted again externally, using a non-zero code to still log it as unsuccesful exit
        process.exit(1234);
      });

    // Now continue with manual polling mode at timing intervals manualReplicationPollingInterval
    setInterval(() => {
      this.getFromCouchDBList();
    }, this.manualReplicationPollingInterval);
  }

  private isArrayTheSame(arrayA: string[], arrayB: string[]): boolean {
    /* console.log(
      '******States before isArrayTheSame comparison is made********'
    );
    console.log('fromCouchDBList is: ');
    console.log(arrayA);
    console.log('currentDBList is: ');
    console.log(arrayB);
    console.log('****************************************'); */

    let isSame = false;
    // Check size first - if size is different than there is no way they are the same
    if (arrayA.length !== arrayB.length) {
      isSame = false;
    } else {
      // loop through the first and compare it to the second
      arrayA.forEach((value, index, array) => {
        if (value === arrayB[index]) {
          // values in both arrays are the same
          isSame = true;
        } else {
          isSame = false;
          return isSame;
        }
      });
    }
    return isSame;
  }

  /**
   * Connect to both couchDB instances via ServerScope
   */
  private async connectToCouchDBInstances() {
    this.serverFromCouchDB = nano(this.fromCouchDBConfig) as ServerScope;
    this.serverToCouchDB = nano(this.toCouchDBConfig) as ServerScope;
  }

  public get fromCouchDBList(): Array<string> {
    return this._fromCouchDBList;
  }

  public set fromCouchDBList(newCouchDBList: Array<string>) {
    console.log('**********Updating to couchDBList in progress.');
    // Update list to the new value
    this._fromCouchDBList = newCouchDBList;
    // Push this new value out to listeners
    this.dbListSubject.next(this._fromCouchDBList);
  }

  /**
   * Obtains the DB list from the source couchDB instance (fromCouchDB) and updates the private variable value if value has changed
   */
  private getFromCouchDBList() {
    // Represents the current state of the DB list
    const currentDBList: string[] = [];
    this.serverFromCouchDB.db
      .list()
      .then(body => {
        // body is an array, hence iterate over it to obtain each db
        body.forEach(db => {
          // We are also going to wall until entire list is complete, and trigger change based on new list not new db
          currentDBList.push(db);
        });

        // At this point, the all DB are captured in list currentDBList

        // Has there been a change from previous state?
        console.log('******States before comparison********');
        console.log('fromCouchDBList is: ');
        console.log(this.fromCouchDBList);
        console.log('currentDBList is: ');
        console.log(currentDBList);
        console.log('****************************************');

        if (this.isArrayTheSame(this.fromCouchDBList, currentDBList)) {
          console.log('**********There is no change.');
          // There has not been a DB change eg. a new DB being added, however for the existing DB that have already been attached
          // a replication listener, any changes in source couchDB will continue to be replicate over to the target couchDB instance
        } else {
          console.log('**********There is a change.');
          // Trigger change
          this.fromCouchDBList = currentDBList;
        }
      })
      .catch(err => {
        console.log(
          '**********There is an error in obtaining the list of databases from source couchDB instance'
        );
        console.log(err);
        // Upon unsuccesful retrieval, we are going to kill the service, to have it restarted again externally
        // Exiting with a non-zero code to still indicate failure for potential use by any logging
        process.exit(1234);
      });
  }

  private resetToCouchDBItems() {
    // from the mirror DBs, only delete DBs in the source DB. Thus, ignoring local DBs that only exist in the mirror.
    this.serverFromCouchDB.db
      .list()
      .then(body => {
        // body is an array, hence iterate over it to obtain each db
        body.forEach(db => {
          this.serverToCouchDB.db
            .destroy(this.prefixDBName(db))
            .then(() => {
              console.log('******Database has been succesfully deleted');
            })
            .catch(err => {
              console.log('Error: Cannot delete database.');
              console.log(err);
            });
        });
      })
      .catch(err => {
        console.log('Error: Cannot retrieve list of databases.');
        console.log(err);
      });
  }

  private runDBReplication(): void {
    // For all the DBs in source couchDB, run replication function

    if (isNullOrUndefined(this.fromCouchDBList)) {
      console.log('**********fromCouchDBList is null or undefined');
      console.log(this.fromCouchDBList);
    } else {
      this.fromCouchDBList.forEach(couchDB => {
        // We'll be using the same db name in the target couchDB, and also creating it via create_target option before replicating
        this.serverFromCouchDB.db
          .replicate(
            couchDB,
            this.toCouchDBAddress + '/' + this.prefixDBName(couchDB),
            {
              create_target: true,
              continuous: true,
            }
          )
          .then(body => {})
          .catch(err => {
            console.log(
              '**********There has been an error in replicating a database. From: ',
              couchDB,
              'To: ',
              couchDB
            );
            console.log(err);
          });
      });
    }
  }

  private prefixDBName(dbName: string): string {
    return 'source-' + dbName;
  }

  private runTestFunctions() {
    this.testCreateDBInToCouchDB();
  }

  private testCreateDBInToCouchDB() {
    this.serverFromCouchDB.db
      .create('alice1')
      .then(() => {
        console.log('******************alice1');
      })
      .catch((err: any) => {
        console.log('Error: ', err);
      });

    this.serverFromCouchDB.db
      .create('alice2')
      .then(() => {
        console.log('******************alice2');
      })
      .catch((err: any) => {
        console.log('Error: ', err);
      });
  }
}
