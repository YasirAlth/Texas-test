import LatLon from 'geodesy/latlon-spherical.js';
import { Logger } from 'log4js';
import { ContextualAlert, EventType } from './interfaces/contextual-alert';
import { CouchEvent } from './interfaces/couch-event';
import { TaskEventDataType } from './interfaces/Event';
import { Task } from './interfaces/task';
import { Track } from './interfaces/track';
import { TrackReceiver } from './TrackReceiver';

// Might not beed this when we have an approve certificate?
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const couchAdminUsername =  process.env.adminUsername;
const couchAdminPassword = process.env.adminPassword;
const releaseName = process.env.RELEASE_NAME;
const namespace =  process.env.NAMESPACE;

/**
 * This class performs the tasking operation of the service. It listens for new tasks and then
 * assigns assets based on their proximity (if available).
 */
export class Tasker {
  // The CouchDB address.
  private couchdbAddress = "http://" + couchAdminUsername + ":" + couchAdminPassword + "@" + releaseName + "-couchdb." + namespace + ".svc.cluster.local:5984";

  // Note: CouchDB names must be lowercase.
  private couchdbTaskingDb = 'tasking';

  // The map of processed events to remember what has been processed.
  private processedEvents = new Map();

  // Handle to the local database.
  private localDb: PouchDB.Database;

  // array of alerts.
  private alerts: ContextualAlert[] = [];

  /**
   * Constructor.
   * @param receiver - the track receiver reference.
   * @param logger - logger reference.
   */
  constructor(private receiver: TrackReceiver, private logger: Logger) {
    // Nodejs way of including the pouch lib.
    const PouchDB = require('pouchdb');

    // Create the remote DB connection.
    const remoteDb = new PouchDB(
      this.couchdbAddress + '/' + this.couchdbTaskingDb
    );

    // And create/open the local db.
    this.localDb = new PouchDB('tasking');

    // Const for 1 day in ms
    const oneDayMs = 1000 * 60 * 60 * 24;

    // Fetch all the local docs.
    this.localDb
      .allDocs({
        attachments: true,
        include_docs: true,
      })
      .then(result => {
        result.rows.forEach(item => {
          (item.doc as any).events
            // Filter out anything older than a day.
            .filter(
              (event: CouchEvent) =>
                new Date(event.payload.timestamp).valueOf() + oneDayMs >
                new Date().valueOf()
            )
            .forEach((event: any, index: number) => {
              // Handle the event.
              this.handleEvent(event);

              // Remember where we are up to for this event ID.
              this.processedEvents.set(item.doc!._id, index + 1);
            });
        });
      });

    // Setup synchronisation with the remote DB.
    PouchDB.sync(remoteDb, this.localDb, {
      live: true,
      retry: true,
    })
      .on('change', (info: any) => {
        // Handle change, pushes only.
        if (info.direction === 'push') {
          info.change.docs.forEach((doc: any) => {
            doc = doc as any;
            let start = 0;
            if (this.processedEvents.get(doc._id) !== undefined) {
              start = this.processedEvents.get(doc._id);
            }

            // Only process events that have yet to the processed.
            const events = doc.events.slice(start);
            events.forEach((event: CouchEvent, index: number) => {
              this.handleEvent(event);
              this.processedEvents.set(doc._id, start + index + 1);
            });
          });
        }
      })
      .on('paused', (msg: any) => {
        // replication paused (e.g. replication up to date, user went offline)
        this.logger.debug('Pouch paused: ' + msg);
      })
      .on('active', () => {
        // replicate resumed (e.g. new changes replicating, user went back online)
        this.logger.debug('Pouch activated');
      })
      .on('denied', (error: any) => {
        // a document failed to replicate (e.g. due to permissions)
        this.logger.debug('Pouch denied: ' + error);
      })
      .on('complete', (info: any) => {
        // handle complete
        this.logger.debug('Pouch complete: ' + info);
      })
      .on('error', (error: any) => {
        // handle error
        this.logger.debug('Pouch Error: ' + error);
        process.exit(1);
      });

    // Load up the tracks from CouchDB.
    this.loadRemoteTracks();

    // Process the tasks every 1000 ms.
    setInterval(() => {
      // Process the tasks.
      this.processTasks();

      // And purge stale tracks...
      this.receiver.purgeTracks();
    }, 1000);
  }

  private async processTasks() {
    // Creates a flatMap.
    const reducer = (accumulator: any, currentValue: any) => [
      ...accumulator,
      ...currentValue,
    ];

    // Get a flat list of the alerts.
    const tasks = this.alerts
      .map((alert: ContextualAlert) => {
        return alert.listOfTasks;
      })
      .reduce(reducer, []);

    // Get the unassigned tasks.
    const unassignedTasks = tasks.filter(
      (task: Task) =>
        task.autoAssign && !task.complete && task.deviceId.length === 0
    );

    // And the assign tasks.
    const assignedTasks = tasks.filter(
      (task: Task) => !task.complete && task.deviceId.length > 0
    );

    this.logger.debug('assigned tasks = ' + assignedTasks.length);

    // Now lets find the available tracks.
    let availableTracks = Array.from(this.receiver.getTracks().values());
    availableTracks = availableTracks.filter(track => {
      return (
        assignedTasks.find((task: Task) =>
          task.deviceId.includes(track.deviceId)
        ) === undefined
      );
    });

    this.logger.debug(
      'availableTracks = ' +
        availableTracks.length +
        ', unassignedTasks = ' +
        unassignedTasks.length
    );

    // Only enter if we have an available  track and an unassigned task.
    if (availableTracks.length > 0 && unassignedTasks.length > 0) {
      for (const task of unassignedTasks) {
        const alert = this.alerts.find(
          (alert: ContextualAlert) => alert.id === task.alertId
        );

        if (alert !== undefined) {
          const taskLocation = new LatLon(
            alert.position.lat,
            alert.position.lon
          );

          // Determine closest asset.
          const closest: Track = availableTracks.reduce((prev, curr) => {
            const currentLocation = new LatLon(
              curr.position.lat,
              curr.position.lon
            );
            const prevLocation = new LatLon(
              prev.position.lat,
              prev.position.lon
            );
            return currentLocation.distanceTo(taskLocation) <
              prevLocation.distanceTo(taskLocation)
              ? curr
              : prev;
          });

          // Add to the task list.
          task.deviceId.push(closest.deviceId);

          const closestPos = new LatLon(
            closest.position.lat,
            closest.position.lon
          );

          // Update the event information.
          task.events.push({
            type: TaskEventDataType.Information,
            title:
              'Auto-assigned ' + closest.deviceName + ' by tasking service',
            description:
              closest.deviceName +
              ' is the closest available asset (' +
              (closestPos.distanceTo(taskLocation) / 1000).toFixed(2) +
              'km) and has been automatically assigned to this task.',
            timestamp: new Date(),
          });

          // Let's update out local db.
          const doc = await this.localDb.get(alert.id);
          await this.updateTasking(alert, doc);

          // Only so lets break and not worry about any futher processing, this will happen in ~1000ms time...
          break;
        }
      }
    }
  }

  /**
   * Updates the local database with the given alert for the given document.
   * @param alert
   * @param doc
   */
  private async updateTasking(alert: ContextualAlert, doc: any) {
    try {
      const event = {
        eventType: EventType.alertUpdated,
        payload: alert,
      };

      // Append the event.
      const events = [...doc.events, event];

      try {
        await this.localDb.put({
          _id: alert.id,
          _rev: doc._rev,
          events,
        });
      } catch (err) {
        this.logger.debug(err);
      }
    } catch (err) {
      this.logger.debug(err);
    }
  }

  /**
   *  Handles the incoming event.
   * @param event
   */
  private handleEvent(event: CouchEvent) {
    this.logger.debug('Received database update.');

    if (event.eventType === EventType.alertAdded) {
      const index = this.alerts.findIndex(a => a.id === event.payload.id);
      if (index === -1) {
        this.alerts.push(event.payload);
      }
    }
    if (event.eventType === EventType.alertUpdated) {
      const index = this.alerts.findIndex(a => a.id === event.payload.id);
      if (index !== -1) {
        this.alerts[index] = event.payload;
      }
    }
    if (event.eventType === EventType.alertDeleted) {
      const index = this.alerts.findIndex(a => a.id === event.payload.id);
      if (index !== undefined) {
        this.alerts = this.alerts.filter(a => a.id !== event.payload.id);
      }
    }
  }

  /**
   * Loads the remote tracks from the CouchDB database.
   */
  private loadRemoteTracks() {
    // Nodejs way of including the pouch lib.
    const PouchDB = require('pouchdb');
    PouchDB.plugin(require('pouchdb-find'));

    // Handle on the remote database.
    const couch = new PouchDB(this.couchdbAddress + '/tracksamqp');

    // Create a search index based on timestamp.
    couch
      .createIndex({
        index: {
          fields: ['timestamp'],
        },
      })
      .then(() => {
        // If a track was updated within this time period then include it in the search.
        const updateThreshold = 1; // minutes.
        const time = new Date();

        // Adjust the search time to some time in the past/
        time.setMinutes(time.getMinutes() - updateThreshold);

        // Perform the search.
        couch
          .find({
            selector: {
              timestamp: { $gt: time },
            },
          })
          .then((data: { docs: any[] }) => {
            // Cast away the pouch-ness.
            const tracks: any[] = data.docs;

            this.logger.debug(`Adding ${tracks.length} existing tracks`);

            // Iterate the results.
            tracks.forEach((track: Track) => {
              // Make the track timestamp  'now' so it remains.
              track.timestamp = new Date();

              this.receiver.addTrack(track.deviceId, track);
            });
          })
          .catch((e: string) => {
            this.logger.error('Error running database query: ' + e);
            process.exit(1);
          });
      })
      .catch((e: string) => {
        this.logger.error('Error creating database index: ' + e);
        process.exit(1);
      });
  }
}
