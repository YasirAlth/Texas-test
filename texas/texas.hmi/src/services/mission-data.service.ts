import {Injectable} from '@angular/core';
import PouchDB from 'pouchdb';
import {IncidentReport} from '../interfaces';
import {Actions, ofActionDispatched, Store} from '@ngxs/store';
import {AddIncidentReport, DeleteIncidentReport, UpdateIncidentReport} from '../actions/incident-reports.actions';
import {IncidentReportState} from '../states/incident-report.state';
import {isNullOrUndefined} from '../functions/Utils';
import {ContextualAlertState} from '../states/contextual-alert.state';
import {UpdateContextualAlert} from '../actions/contextual-alert.actions';
import {UpdateType} from '../enums/update-type';
import {UpdateState} from '../enums/update-state';
import {catchError, first, map} from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {HttpClient} from '@angular/common/http';

/**
 * Service to load the mission data.
 */
@Injectable({
  providedIn: 'root'
})
export class MissionDataService {

  // The remote couch instance.
  private missionDataDb: PouchDB.Database<{}>;

  // The name of the mission data db.
  private missionDataDbName = 'mission-data';

  // The incident update database name.
  private incidentUpdateDbName = 'incident-reports';

  // The remote incident database.
  private remoteIncidentDb: PouchDB.Database<{}>;

  // The local incident database.s
  private localIncidentDb: PouchDB.Database<{}>;

  // True if the mission data db is loaded.
  missionDataLoaded: Promise<void>;

  /**
   * Constructor
   *
   */
  constructor(private store: Store,
              private actions$: Actions,
              private http: HttpClient) {
    this.actions$
      .pipe(ofActionDispatched(AddIncidentReport))
      .subscribe(async ({ payload, propagate }) => {
        if (propagate) {
          try {
            const result = await this.localIncidentDb.put(payload);
          } catch (error) {
            console.error(error);
          }
        }
      });

    this.actions$
      .pipe(ofActionDispatched(UpdateIncidentReport))
      .subscribe(async ({ payload, propagate }) => {
        if (propagate) {
          // Propagate is true so add to our local db..
          try {
            const doc = await this.localIncidentDb.get(payload._id);
            payload._rev =  doc._rev;
            try {
              const response = await this.localIncidentDb.put(payload);
            } catch (err) {
              console.log(err);
            }
          } catch (err) {
            console.log(err);
          }
        }
      });

    this.actions$
      .pipe(ofActionDispatched(DeleteIncidentReport))
      .subscribe(async ({ payload, propagate }) => {
        if (propagate) {
          // TODO (oayload == incident ID)
        }
      });
  }

  /**
   * Configures the service.
   * @param server- the url to the couchDB server.
   */
  public async configure(server: string) {
    // Create the loaded promise.
    this.missionDataLoaded = new Promise<void>((resolve, reject) => {
      this.missionDataDb = new PouchDB(server + '/' + this.missionDataDbName, { skip_setup: true });

      this.localIncidentDb = new PouchDB( this.incidentUpdateDbName);
      this.remoteIncidentDb = new PouchDB(server + '/' + this.incidentUpdateDbName);

      resolve();

      // setInterval(() => {
      //   this.addIncidentInformation(
      //     {
      //       _id: Guid.create().toString(),  AlertId: '', location: '', newValue: 0, observer: '', state: undefined, updateType: undefined
      //     }
      //   );
      // }, 5000);
    });

    // Const for 3 hours  in ms
    const threeHours = 1000 * 60 * 60 * 3;

    // Load alerts from local database.
    try {
      const result = await this.localIncidentDb.allDocs<IncidentReport>({
        include_docs: true,
        attachments: true
      });

      result.rows
        .filter(item =>  new Date(item.doc.timestamp).valueOf() + threeHours > new Date().valueOf())
        .forEach(item => {
        this.store.dispatch(new AddIncidentReport(item.doc, false));
      });
    } catch (err) {
      console.log(err);
    }

    // Setup the replication between the local incident database and the remote one.
    this.localIncidentDb.sync( this.remoteIncidentDb, {
      live: true,
      retry: true,
    }).on('change', (info) => {
      if (info.direction === 'pull') {
        const incidents = this.store.selectSnapshot(IncidentReportState.incidentReports);

        info.change.docs.forEach(document => {
          const entry = (document as any);
          if (entry._deleted === true) {
            this.store.dispatch(new DeleteIncidentReport(entry._id, false));
          } else {
            const incident = incidents.find(i => i._id === entry._id);

            if (!isNullOrUndefined(incident)) {
              this.store.dispatch(new UpdateIncidentReport(entry, false));
            } else {
              this.store.dispatch(new AddIncidentReport(entry, false));
            }
          }
        });
      }
    }).on('paused', (err) =>  {
      // replication paused (e.g. replication up to date, user went offline)
    }).on('active', () =>  {
      // replicate resumed (e.g. new changes replicating, user went back online)
    }).on('denied', (err)  => {
      // a document failed to replicate (e.g. due to permissions)
    }).on('complete', (info) =>  {
      // handle complete
    }).on('error', (err) => {
      // handle error
    });
  }

  /**
   * returns the mission data for the given documentId
   * @param documentId - the Id of the document being requested.
   */
  public async getMissionData<T>(documentId: string) {
    await this.missionDataLoaded;
    return await this.missionDataDb.get<T>(documentId);
  }

  /**
   * returns the mission data for the given documentId
   * @param documentId - the Id of the document being requested.
   * @param defaultFile - xxx
   */
  public async getMissionDataWithDefault<T>(documentId: string, defaultFile: string) {
    await this.missionDataLoaded;
    try {
      return await this.getMissionData<any>(documentId);
    } catch (e) {
      return await this.getDefault(defaultFile).pipe(first()).toPromise();
    }
  }

  /**
   *
   * @param file
   */
  private getDefault(file: string): Observable<any> {
    return this.http.get('./assets/mission-data-defaults/' + file).pipe(
      map((res: any) => res),
      catchError(error => throwError(error)));
  }

  /**
   * Add the given incident to the mission data.
   */
  public addIncidentInformation(update: IncidentReport) {
    this.store.dispatch(new AddIncidentReport(update, true));
  }

  /**
   * Updates the given incident to the mission data.
   */
  public updateIncidentInformation(update: IncidentReport) {
    if (update.state === UpdateState.Accepted) {
      // Find the contextual alert
      const alert = this.store.selectSnapshot(ContextualAlertState.contextualAlerts).find(a => a.id === update.alertId);
      if (alert) {
        const incidentReport = alert.incidentReport || {};

        switch (update.updateType) {
          case UpdateType.Rescued:
            incidentReport.rescuedPersonCount = update.newValue;
            break;
          case UpdateType.Unrescued:
            incidentReport.identifiedPersonCount = update.newValue;
            break;
          case UpdateType.Manifest:
            incidentReport.expectedMissionPersonCount = update.newValue;
        }

        alert.incidentReport = incidentReport;

        this.store.dispatch(new UpdateContextualAlert(alert));
      }
    }

    this.store.dispatch(new UpdateIncidentReport(update, true));
  }

  /**
   * Deletes the given incident from the mission data
   */
  public deleteIncidentInformation(id: string) {
    this.store.dispatch(new DeleteIncidentReport(id, true));
  }
}
