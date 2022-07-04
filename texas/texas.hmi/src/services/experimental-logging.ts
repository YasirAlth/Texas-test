import { Injectable } from '@angular/core';
import { ExpLogDataEntry } from '../interfaces/exp-log-data';
import PouchDB from 'pouchdb';
import {ConfigService} from './config';
import {Subscription} from 'rxjs';
import {Actions, ofActionDispatched, Store} from '@ngxs/store';
import {AddLoggingEntry, RemoveLoggingEntry} from '../actions/experimental-control.actions';
import {Settings} from '../interfaces';
import {isNullOrUndefined} from '../functions/Utils';

/*
 * Logging service for experiment log data.
 * See interfaces/exp-log-data for data structure.
 */
@Injectable()
export class ExperimentalLoggingService {

  // List of subscriptions.
  subscriptions = new Subscription();

  // The local and remote database objects.
  private localDb: PouchDB.Database<{}> = null;
  private remoteDb: PouchDB.Database<{}> = null;

  // Local ref to the settings.
  settings: Settings = null;

  /**
   * Constructor
   * @param config - reference to the config service.
   * @param actions$ - reference to the ngxs actions service.
   * @param store - reference to the ngxs store.
   */
  constructor(private config: ConfigService,
              private actions$: Actions,
              private store: Store) {

    // Wait for the config service to load.
    this.config.configLoaded.then(() => {
      this.subscriptions.add(this.config.settingsChanged$.subscribe(settings => {

        if (isNullOrUndefined(settings)) {
          return;
        }

        // Save local reference to the settings.
        this.settings = settings;

        // Create the local database.
        this.localDb = new PouchDB('experiment-logging');

        // Create the remote database.
        this.remoteDb = new PouchDB(settings.couchDatabaseServer + '/experiment-logging');

        // Lets get a list of documents from the local database
        try {
            this.localDb.allDocs<ExpLogDataEntry>({
              include_docs: true,
              attachments: true
            }).then(results => {
              results.rows.forEach(item => {
                this.store.dispatch(new AddLoggingEntry(item.doc, false));
              });
            });
          } catch (err) {
            console.log(err);
          }

        // Set up synchronisation between the local and remote databases.

        this.localDb.sync(this.remoteDb, {
          live: true,
          retry: true
        }).on('change', (info) => {
          // Handle the push events, ie u
          if (info.direction === 'pull') {
            info.change.docs.forEach(document => {
              const entry = (document as any);
              if (entry._deleted === true) {
                this.store.dispatch(new RemoveLoggingEntry(entry._id, false));
              } else {
                this.store.dispatch(new AddLoggingEntry(entry, false));
              }
            });
          }
        });

        // Ok so lets subscribe to Add Logging Entry Action so we can propagate the event if required.
        this.actions$
          .pipe(ofActionDispatched(AddLoggingEntry))
          .subscribe(async ({ payload, propagate }) => {
            if (propagate) {
              try {
                // Post locally, syncing will propagate to other nodes.
                await this.localDb.put(payload);
              } catch (err) {
                console.error(err);
              }
            }
          });
      }));
    });
  }

  /**
   * Archives the current log.
   */
  public async archive() {
    if (!(isNullOrUndefined(this.settings))) {
      try {
        const archiveDb = new PouchDB(this.settings.couchDatabaseServer + '/experiment-logging-' + new Date().valueOf());
        await this.remoteDb.replicate.to(archiveDb);

        const result = await this.localDb.allDocs();

        await Promise.all(result.rows.map((row) => {
          // Remove from ngxs.
          this.store.dispatch(new RemoveLoggingEntry(row.id, false));

          // Return the promise of removing from the local db.
          return this.localDb.remove(row.id, row.value.rev);
        }));

        // All ok
        return true;

      } catch (error) {
        // Replication failed, rethrow.s
        throw error;
      }
    }
  }
}
