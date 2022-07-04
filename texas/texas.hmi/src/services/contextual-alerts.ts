import {Injectable} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {ConfigService} from './config';
import {OwnTrackService} from './own-track';
import {ContextualAlert, CouchEvent, EventType, IncidentReport, TaskEventDataType, Track} from '../interfaces';
import PouchDB from 'pouchdb';
import {Actions, ofActionDispatched, Select, Store} from '@ngxs/store';
import {ActionSheetController, AlertController, ModalController, ToastController} from '@ionic/angular';
import {AddContextualAlert, DeleteContextualAlert, UpdateContextualAlert} from '../actions/contextual-alert.actions';
import {isNullOrUndefined} from 'src/functions/Utils';
import {Router} from '@angular/router';
import {ActionSheetButton} from '@ionic/core/dist/types/components/action-sheet/action-sheet-interface';
import {AddTaskNoteComponent} from '../components/add-task-note/add-task-note.component';
import {IncidentReportState} from '../states/incident-report.state';
import {UpdateState} from '../enums/update-state';
import {RoleService} from './role.service';

/**
 * This service handles contextual alert related functionality, such as database replication and
 * some common routines for popups and UI widgets.
 */
@Injectable()
export class ContextualAlertService {

  // The track representing this device (provided by OwnTrackService)
  private owntrack: Track;

  // The remote database  object
  remoteDb = null;

  // THe local database object.
  localDb = null;

  // List of subscriptions.
  subscriptions = new Subscription();

  // Maintains a list of processed events for each contextual alert.
  processedEvents = new Map();

  // all the alerts observerable.
  @Select(IncidentReportState.incidentReports) incidents$: Observable<IncidentReport[]>;

  /**
   * Constructor.
   *
   * @param config - reference to the config service.
   * @param ownTrackService - reference to the own track service.
   * @param toastCtrl - reference to the Ionic toast controller.
   * @param store - reference to the ngxs store service.
   * @param actions$ - reference to the ngxs actions service.
   * @param popupController - reference to the Ionic popup controller.
   * @param actionSheetController - reference to the Ionic action sheet controller.
   * @param router - reference to the Angular router service.
   * @param modalController - reference to the Ionic modal controller.
   */
  constructor(
    private config: ConfigService,
    private ownTrackService: OwnTrackService,
    private toastCtrl: ToastController,
    private store: Store,
    private actions$: Actions,
    public popupController: AlertController,
    public actionSheetController: ActionSheetController,
    private router: Router,
    public modalController: ModalController,
    private role: RoleService) {

    // Subscribe to the settings service.
    this.subscriptions.add(this.config.settingsChanged$.subscribe(async settings => {

      if (isNullOrUndefined(settings)) { return; }

      if (this.remoteDb === null) {

        // Create the remote database.
        this.remoteDb = new PouchDB(this.config.settings.couchDatabaseServer + '/tasking');

        // Create the local database.
        this.localDb = new PouchDB('tasking');

        // Const for 3 hours  in ms
        const threeHours = 1000 * 60 * 60 * 3;

        // Load alerts from local database.
        try {
          const result = await this.localDb.allDocs({
            include_docs: true,
            attachments: true
          });

          result.rows.forEach(item => {
            item.doc.events.filter(
              (event: CouchEvent) =>
                // Filter out anything older than a day.
                new Date(event.payload.timestamp).valueOf() + threeHours > new Date().valueOf()
            ).forEach((event, index) => {
              // Handle each event for this alert.
              this.handleCouchEvent(event);
              // And remember the current processed index.
              this.processedEvents.set(item.doc._id, index + 1);
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
          // Handle updates from the remote only.
          if (info.direction === 'pull') {

            info.change.docs.forEach(document => {
              const doc =  (document as any);
              let start = 0;
              if (this.processedEvents.get(doc._id) !== undefined) {

                // Find where we are up to for this alert.
                start = this.processedEvents.get(doc._id);
              }

              // Only process unprocessed events.
              const events = doc.events.slice(start);

              events.forEach((event, index) => {
                // Handle each event for this alert.
                this.handleCouchEvent(event);
                // And remember the current processed index.
                this.processedEvents.set(doc._id, start + index + 1);
               });
            });
          }
        }).on('paused', () => {
          // replication paused (e.g. replication up to date, user went offline)
          console.log('pouch paused.');
        }).on('active', () => {
          // replicate resumed (e.g. new changes replicating, user went back online)
          console.log('pouch active.');
          // console.log('*********** pouch active! ');
        }).on('denied', (err) => {
          // a document failed to replicate (e.g. due to permissions)
          console.log('pouch denied ' + JSON.stringify(err));
        }).on('complete', (info) => {
          // handle complete
           console.log('pouch complete: ' + JSON.stringify(info));
        }).on('error', (err) => {
          // handle error
          console.log('pouch error: ' + JSON.stringify(err));
        });
      }
    }));

    // Subscribe to the AddContextualAlert action.
    this.actions$
       .pipe(ofActionDispatched(AddContextualAlert))
       .subscribe(async ({ payload, propagate }) => {
         if (propagate) {
           // Propagate is true so add to our local db..

           // Create the add event.
           const event: CouchEvent = {
             eventType: EventType.alertAdded,
             payload
           };

           try {
             await this.localDb.put({
               _id: payload.id,
               events: [event]
             });
           } catch (err) {
             console.log(err);
           }
         }
       });

    // Subscribe to the DeleteContextualAlert action.
    this.actions$
      .pipe(ofActionDispatched(DeleteContextualAlert))
      .subscribe(async ({ payload, propagate }) => {
        if (propagate) {
          // Propagate is true so add to our local db..
          try {
            const doc = await this.localDb.get(payload.id);

            // Create the delete event.
            const event: CouchEvent = {
              eventType: EventType.alertDeleted,
              payload
            };

            // Update the events array.
            const events = [...doc.events, event];
            try {
              const response = await this.localDb.put({
                _id: payload.id,
                _rev: doc._rev,
                events
              });
            } catch (err) {
              console.log(err);
            }
          } catch (err) {
            console.log(err);
          }
        }
      });

    // Subscribe to the UpdateContextualAlert action.
    this.actions$
      .pipe(ofActionDispatched(UpdateContextualAlert))
      .subscribe(async ({ payload, propagate }) => {
        if (propagate) {
          // Propagate is true so add to our local db..
          try {
            const doc = await this.localDb.get(payload.id);

            // Create the update event.
            const event: CouchEvent = {
              eventType: EventType.alertUpdated,
              payload
            };

            // Update the events array.
            const events = [...doc.events, event];
            try {
              const response = await this.localDb.put({
                _id: payload.id,
                _rev: doc._rev,
                events
              });
            } catch (err) {
              console.log(err);
            }
          } catch (err) {
            console.log(err);
          }
        }
      });

    // On own track changed, update the local cache with the new value
    this.ownTrackService.ownTrackChanged$.subscribe(track => this.owntrack = track);

    this.incidents$.subscribe(incidents => {
      const acceptedIntercepts = incidents.filter(incident => incident.state === UpdateState.Accepted);
      acceptedIntercepts.find(incident => {
      });
    });
  }

  /**
   * Handles the incoming couch event.
   * @param event - the event data.
   */
  private handleCouchEvent(event: CouchEvent) {

    console.log('+handleCouchEvent');

    // Handle and dispatch to the state store.
    if (event.eventType === EventType.alertAdded) {
      this.store.dispatch(new AddContextualAlert(event.payload, false));
    }
    if (event.eventType === EventType.alertUpdated) {
      this.store.dispatch(new UpdateContextualAlert(event.payload, false));
    }
    if (event.eventType === EventType.alertDeleted) {
      this.store.dispatch(new DeleteContextualAlert(event.payload, false));
    }

    console.log('-handleCouchEvent');
  }

  /**
   * Reuseable method to display a bunch of alert options.
   * @param alert - the alert to show the options for.
   * @param fromMap - true if this command came from the map.
   */
  async displayAlertOptions(alert: ContextualAlert, fromMap: boolean) {

    const buildButtons = () => {
      const buttons = [];

      // Button for deleting the alert.
      if (this.role.hasRole('deleteAlert')) {
        buttons.push({
          text: 'Delete',
          role: 'destructive',
          icon: 'trash',
          handler: async () => {
            const popup = await this.popupController.create({
              header: 'Delete Alert?',
              message: 'This will deletes the alert for all users.',
              buttons: [
                {
                  text: 'Cancel',
                  role: 'cancel'
                },
                {
                  text: 'Delete',
                  role: 'delete',
                  handler: () => {
                    // Dispatch the event
                    this.store.dispatch(new DeleteContextualAlert(alert));
                    if (!fromMap) {
                      this.router.navigate(['/sa-container/alerts']);
                    }
                  }
                }
              ]
            });

            await popup.present();
          }
        });
      }

      if (fromMap) {
        // Only from the map - option to view the alert detail.
        buttons.push({
          text: 'View Detail',
          icon: 'map',
          handler: () => {
            this.router.navigate(['/sa-container/alert-detail',  alert.id]);
          }
        });
      }
      if (!fromMap) {
        // Anywhere but from the map - option to view the alert on the map.

        // Unlock the map lock so the menu can move to the centre.
        this.config.settings.maplockOwntrack = false;

        buttons.push({
          text: 'View on Map',
          icon: 'map',
          handler: () => {
            this.router.navigate(['/sa-container/map',  alert.position.lat, alert.position.lon]);
          }
        });
      }

      // Cancel button.
      buttons.push({
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
        }
      });

      return buttons;
    };

    const actionSheet = await this.actionSheetController.create({
      header: 'Alert Options',
      buttons: buildButtons()
    });

    await actionSheet.present();
  }

  /**
   * Reuseable method to display a bunch of task options.
   * @param task - the task to show the options for.
   * @param alert - the associated alert.
   */
  async displayTaskOptions(task, alert) {

    const taskOptionButtons = (): ActionSheetButton[] => {
      const buttons = [];

      // Button for making a task as complete.
      buttons.push({
        text: !task.complete ? 'Mark Complete' : 'Mark Incomplete',
        icon: !task.complete ? 'checkmark-circle' : 'close-circle',
        handler: () => {
          task.complete = ! task.complete;

          // Create the event.
          task.events.push({
            type: TaskEventDataType.Information,
            timestamp: new Date(),
            title: this.owntrack.deviceName + (task.complete ? ' completed ' : ' uncompleted ') + 'task.',
            description: ''
          });

          // Dispatch the event to the store.
          this.store.dispatch(new UpdateContextualAlert(alert, true));
        }
      });

      // Button to add a note to a task.s
      buttons.push({
        text: 'Add Task Note',
        icon: 'text',
        handler: async () => {
          const modal = await this.modalController.create({
            component: AddTaskNoteComponent
          });

          await modal.present();
          const { data } = await modal.onWillDismiss();

          if (data) {
            // Create the event.
            task.events.push({
              type: TaskEventDataType.Information,
              timestamp: new Date(),
              title: this.owntrack.deviceName + ' added a Task Note',
              description: data
            });
            // Dispatch the event to the store.

            this.store.dispatch(new UpdateContextualAlert(alert, true));
          }
        }
      });

      // TODO maybe add these in one day?
      // buttons.push({
      //   text: 'Add Image',
      //   icon: 'image',
      //   handler: () => {
      //     console.log('Share clicked');
      //   }
      // });

      // buttons.push({
      //   text: 'Add Video',
      //   icon: 'videocam',
      //   handler: () => {
      //     console.log('Share clicked');
      //   }
      // });
      //

      if (this.role.hasRole('deleteTask')) {
        // Button to delete the task.
        buttons.push({
          text: 'Delete',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            // Delete task and dispatch event to store.
            alert.listOfTasks = alert.listOfTasks.filter(t => t.id !== task.id);
            this.store.dispatch(new UpdateContextualAlert(alert, true));
          }
        });
      }

      // Cancel button.
      buttons.push({
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      });

      return buttons;
    };

    const actionSheet = await this.actionSheetController.create({
      header: 'Task Options',
      buttons: taskOptionButtons()
    });
    await actionSheet.present();
  }
}
