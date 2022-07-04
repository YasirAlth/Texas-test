import { Component, OnInit, OnDestroy, Pipe } from '@angular/core';
import { ActionSheetController, ModalController, AlertController } from '@ionic/angular';
import { TimeModalPage } from './control-modals/time-modal-page';
import { TextInputModalPage } from './control-modals/text-input-modal';
import { ExpLogDataEntry } from 'src/interfaces/exp-log-data';
import { ExperimentalLoggingService } from 'src/services/experimental-logging';
import {Observable, Subscription} from 'rxjs';
import { ConfigService } from 'src/services/config';
import { Settings } from 'src/interfaces/settings';
import {Select, Store} from '@ngxs/store';
import {Guid} from 'guid-typescript';
import {isNullOrUndefined} from '../../../functions/Utils';
import {ExperimentalLoggingState} from '../../../states/experimental-logging.state';
import {AddLoggingEntry} from '../../../actions/experimental-control.actions';

@Component({
  selector: 'page-experimental-control',
  templateUrl: 'experimental-control.html',
  styleUrls: ['experimental-control.scss']
})

export class ExperimentalControlPage implements OnInit, OnDestroy {

  dataReturned: any;
  entries: ExpLogDataEntry[] = []; // is this required? can we just access it from storage
  subscriptions = new Subscription();
  settings: Settings;
  deviceName = 'deviceName';
  deviceId = 'deviceId';

  // Logging Entries observable.
  @Select(ExperimentalLoggingState.loggingEntries) loggingEvents$: Observable<ExpLogDataEntry[]>;

  constructor(public actionSheetController: ActionSheetController,
              public modalController: ModalController,
              private experimentalLoggingService: ExperimentalLoggingService,
              public popupController: AlertController,
              private config: ConfigService,
              private store: Store) {
    this.subscriptions.add(this.config.settingsChanged$.subscribe((settings: Settings) => {
      if (isNullOrUndefined(settings)) { return; }
      this.settings = settings;
    }));
    this.deviceName = this.config.settings.deviceName;
    this.deviceId = this.config.settings.deviceId;

    this.loggingEvents$.subscribe(entries => {
      this.entries = entries;
    });
  }

  ngOnInit(): void {

  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Controls',
      buttons: [{
        text: 'Start',
        role: '',
        icon: 'play',
        handler: () => {
          this.startButtonHandler(new Date());
        }
      }, {
        text: 'Stop',
        role: '',
        icon: 'flag',
        handler: () => {
          this.stopButtonHandler(new Date());
        }
      }, {
        text: 'Add Observation',
        role: '',
        icon: 'add-circle',
        handler: () => {
          this.addObservationHandler(new Date());
        }
      }, {
        text: 'Add Note',
        role: '',
        icon: 'add',
        handler: () => {
          this.addNoteHandler(new Date());
        }
      }]
    });
    await actionSheet.present();
  }

  private addEntry(timestamp: Date, entryType: string, entryValue: string, entryLoggerDeviceName: string, loggerDeviceId: string) {
    const newEntry: ExpLogDataEntry = {
      _id: Guid.create().toString(),
      timestamp,
      entryType,
      entryValue,
      entryLoggerDeviceName,
      loggerDeviceId
    };

    this.store.dispatch(new AddLoggingEntry(newEntry));
  }

  /*
   * Using the time clicked as the start time. Second phase of this button could
   * have the option to present an editable display of the time eg. via openTimeModal
   * that can be altered by mins, to create the start time.
   */
  private startButtonHandler(currentTime: Date) {
    if (this.canStart()) {
      this.addEntry(currentTime, 'start', 'Experiment started', this.deviceName, this.deviceId);
    } else {
    }

  }

  private stopButtonHandler(currentTime: Date) {
    if (this.canStop()) {
      this.addEntry(currentTime, 'stop', 'Experiment stopped', this.deviceName, this.deviceId);
    } else {
    }
  }

  private async addObservationHandler(currentTime: Date) {
    if (this.canAddObservation() ) {
      this.openTextInputModal('observation', currentTime);
    } else {
    }
  }

  // To support any miscellaneous notes to record during the experiment.
  private async addNoteHandler(currentTime: Date) {
    if (this.canAddNote()) {
      this.openTextInputModal('note', currentTime);
    } else {
    }
  }

  // Can be extended to support different types of textual input by changing the string (label)
  // passed into to decorate the modal.
  async openTextInputModal(textInputModalType: string, currentTime: Date) {
    const textInputModal = await this.modalController.create({
      component: TextInputModalPage,
      componentProps: {
        textInputModalType,
        currentTime
      },
      backdropDismiss: false
    });
    textInputModal.onDidDismiss().then(dataReturned => {
      if (dataReturned.data !== null) {
        this.dataReturned = dataReturned.data;
        this.addEntry(currentTime, textInputModalType, this.dataReturned, this.deviceName, this.deviceId);
        this.dataReturned = {};
      }
    });
    return await textInputModal.present();
  }

  // Prompts the user to confirm this action of clearing the log.
  async archiveEntries() {
    if (this.entries === null || this.entries === undefined) {
      // Nothing has been logged. Ignore action.
    } else {
      const popup = await this.popupController.create({
        header: 'Experimental Control',
        message: 'Are you sure you want to archive the log?',
        buttons: [
          {
            text: 'OK',
            role: 'ok',
            handler: async () => {
              try {
                await this.experimentalLoggingService.archive();
              } catch (error) {
                console.error('Archiving failed?' + error);
              }
            }
          },
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              // Ignore this.
            }
          }
        ]
      });

      popup.present();
    }
  }

  async openTimeModal(timeModalType: string, currentTime: Date) {
    const timeModal = await this.modalController.create({
      component: TimeModalPage,
      componentProps: {
        timeModalType,
        currentTime
      }
    });
    timeModal.onDidDismiss().then((dataReturned) => {
      if (dataReturned.data !== null) {
        this.dataReturned = dataReturned.data;
      }
    });
    return await timeModal.present();
  }

  // Can only start if start has not been added to the log.
  // But can also start if the log is empty and nothing has been logged yet, as this is the natural starting point.
  private canStart(): boolean {
    // Log is empty but we can start
    if (this.entries === null || this.entries === undefined) {
      return true;
    } else {
      const entry = this.entries.find(e => e.entryType === 'start' );
      if (entry) {
        this.alertPopup('Cannot start. Start has already been logged.', 'Experimental Control');
        return false;
      } else {
        return true;
      }
    }
  }

  // Can stop if you haven't stopped yet.
  // But need to stop only if logging has started.
  private canStop(): boolean {
    // Log is empty and cannot stop
    if (this.entries === null || this.entries === undefined) {
      this.alertPopup('Cannot stop. Logging has not started.', 'Experimental Control');
      return false;
    } else {
      const entry = this.entries.find(e => e.entryType === 'stop' );
      if (entry) {
        this.alertPopup('Cannot stop. Stop has already been logged.', 'Experimental Control');
        return false;
      } else {
        const hasStarted = this.entries.find(e => e.entryType === 'start' );
        if (hasStarted) {
          return true;
        } else {
          this.alertPopup('Cannot stop. Experiment logging has not been started.', 'Experimental Control');
          return false;
        }
      }
    }
  }

  private canAddObservation(): boolean {
    // Log is empty and cannot add observation
    if (this.entries === null || this.entries === undefined) {
      this.alertPopup('Cannot add observation. Logging has not started.', 'Experimental Control');
      return false;
    } else {
      // Can only add if start exists and stop doesn't exist
      const hasStarted = this.entries.find(e => e.entryType === 'start' );
      const hasStopped = this.entries.find(e => e.entryType === 'stop' );
      if (hasStarted && !hasStopped) {
        return true;
      } else {
        this.alertPopup('Cannot add observation. Logging has stopped.', 'Experimental Control');
        return false;
      }
    }
  }

  // Can add miscellaneous notes anytime. Should this change we can add in further checks in here.
  private canAddNote(): boolean {
    // Log is empty but can add miscellaneous note
    if (this.entries === null || this.entries === undefined) {
      return true;
    } else {
      // No constraints in place yet for adding a note
      return true;
    }
  }

  async alertPopup(message: string, header: string) {
    const popup = await this.popupController.create({
      header,
      message,
      buttons: ['OK']
    });
    popup.present();
  }
}
