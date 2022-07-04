import { Injectable } from '@angular/core';
import { Observable, Subscription} from 'rxjs';
import { ConfigService } from './config';
import { Vibration } from '@ionic-native/vibration/ngx';
import { OwnTrackService } from './own-track';
import { Track } from '../interfaces';
import { AudioService } from './audio';
import { QueryService } from './query';
import { TextToSpeech } from '@ionic-native/text-to-speech/ngx';
import {ToastController} from '@ionic/angular';
import { Store} from '@ngxs/store';
import {ContextualAlertState} from '../states/contextual-alert.state';
import {Task} from '../interfaces';
import {filter} from "rxjs/operators";
import {isNullOrUndefined} from "../functions/Utils";
import {Location} from "@angular/common";
import {Router} from "@angular/router";

/**
 * A service to provide audio and vibration notifications for contextual alerts.
 * To be re-implemented under https://labs.consilium.technology/jira/browse/TEXAS-70.
 */
@Injectable()
export class ContextualAlertNotificationService {

  private static readonly VIBRATION_TIMEOUT = 1500; // 1.5 seconds (careful setting this, it can affect the alert sound)
  private static readonly SIREN_TIMEOUT = 10000; // 10 seconds (8s audio)
  private static readonly SPEECH_INTERVAL = 30000; // 30 seconds

  private speechTimer: number;


  private numAlerts = 0;
  numAlerts$: Observable<number>;

  private numTasks = 0;

  numTasks$: Observable<number>;
  tasks$: Observable<Array<Task>>;
  tasks: Array<Task> = [];

  subscriptions = new Subscription();

  toast = null;

  ready = false;

  constructor(
    private config: ConfigService,
    private audioService: AudioService,
    private toastCtrl: ToastController,
    private vibration: Vibration,
    private tts: TextToSpeech,
    private queryService: QueryService,
    private store: Store,
    private router: Router
  ) {

    // preload the alert sound
    this.audioService.preload('alert', 'assets/audio/siren.mp3');

    this.config.configLoaded.then(() =>  {

      setTimeout(() => {
        this.ready = true;
      }, 60 * 1000);

      this.numTasks$ = this.store.select(ContextualAlertState.numTasksForDevice( this.config.settings.deviceId));

      this.subscriptions.add(this.numTasks$.pipe(filter(x => x !== this.numTasks)).subscribe(async num => {

        const goneUp = num > this.numTasks;
        this.numTasks = num;

        if (goneUp && this.config.isOnDevice() && this.ready) {

          console.log('****inside numtasks handler (tasks: ' + this.numTasks + ')');

          this.vibration.vibrate(ContextualAlertNotificationService.VIBRATION_TIMEOUT);

          if(isNullOrUndefined(this.toast)) {
            this.toast = await this.toastCtrl.create({
              message: `New task - you have ${num} assigned task(s).`,
              showCloseButton: false,
              buttons: [
                {
                  side: 'end',
                  text: 'View Tasks',
                  handler: () => {
                    this.router.navigate(['/sa-container/tasks']);
                  }
                }],
              position: 'middle',
              duration: 0,
              color: 'danger'
            });

            await this.toast.present();

            this.toast.onDidDismiss().then(() => {
              this.toast = null;
            });
          }

          if (this.config.settings.alertSoundOn) {
            this.audioService.play('alert');
            console.log('****playing sound: ' + this.numTasks + ')');
          }
        }
      }));

      this.numAlerts$ = this.store.select(ContextualAlertState.contextualAlertsLength);

      this.subscriptions.add(this.numAlerts$.pipe(filter(x => x !== this.numAlerts)).subscribe(async num => {

        const goneUp = num > this.numAlerts;
        this.numAlerts = num;

        if (goneUp && this.config.isOnDevice() && this.ready) {

          this.vibration.vibrate(ContextualAlertNotificationService.VIBRATION_TIMEOUT);
          const toast = await this.toastCtrl.create({
            message: `New alert - there are currently ${num} alert(s).`,
            showCloseButton: true,
            closeButtonText: 'Ok',
            position: 'middle',
            duration: 10000,
            color: 'warning'
          });

          toast.present();
        }
      }));

      this.tasks$ = this.store.select(ContextualAlertState.tasksForDevice( this.config.settings.deviceId));
      this.subscriptions.add(this.tasks$.subscribe(tasks => {
        this.tasks = tasks;
      }));
    });
  }

  private async startSpeechTimer() {
    if (this.numTasks) {
      await this.playAlertSpeech();
    }
  }

  private speech(text: string): Promise<any> {
    return this.tts.speak({text, locale: 'en-AU', rate: 1.0});
  }

  private async playAlertSpeech() {

    const count = this.numTasks;
    const speechCount = count === 1 ? 'You have 1 active task.' : 'You have ' + count + ' active tasks.';

    // let index = 0;
    // let activeCounter = 0;
    // const describeNextAlert = (): void => {
    //   // get next active alert
    //   let task: Task;
    //   do {
    //     if (index >= this.tasks.length) {
    //       // No more alerts to describe
    //       return;
    //     }
    //     task = this.tasks[index++];
    //   } while (!task.active);
    //
    //   // increment the active count for the audible alert number
    //   activeCounter++;
    //
    //   this.queryService.getEta(this.owntrack.position, alert.position).subscribe(data => {
    //     const heading = this.owntrack.heading;
    //     const direction = data.bearing;
    //     const diff = direction - heading;
    //     let angle = (((diff + 180) % 360 + 360) % 360) - 180; // Note: ensure non-zero wrapping between 0 & 360, but then offset by 180
    //     const compass = Dms.compassPoint(direction, 2); // intercardinal (2 words)
    //     let distance = data.distance;
    //     let eta = data.eta;
    //
    //     distance = Number(Number(distance).toPrecision(2)); // 2 figures
    //     const distanceDescription = distance >= 1000 ? (distance / 1000 + 'km ') : (distance + 'm ');
    //     angle = Math.round(angle / 10) * 10; // multiple of 10 degrees
    //
    //     const absAngle = Math.abs(angle);
    //     const isRight = angle >= 0;
    //     let angleDescription;
    //     if (absAngle === 0) {
    //       angleDescription = 'straight ahead';
    //     } else if (absAngle === 180) {
    //       angleDescription = 'behind you';
    //     } else {
    //       angleDescription = absAngle + ' degrees to your ' + (isRight ? 'right' : 'left');
    //     }
    //     const compassDescription = compass.replace('N', 'north').replace('E', 'east').replace('S', 'south').replace('W', 'west');
    //
    //     let timeDescription;
    //     if (eta < 60) {
    //       // show value in seconds
    //       timeDescription = (Math.round(eta / 5) * 5) + ' seconds';
    //     } else {
    //       eta = Math.round(eta / 60); // convert to minutes
    //       const minutes = eta % 60;
    //       timeDescription = minutes + ' minute' + (minutes !== 1 ? 's' : '');
    //
    //       const hours = Math.floor(eta / 60);
    //       if (hours) {
    //         // prefix with hours
    //         timeDescription = hours + ' hours and ' + timeDescription;
    //       }
    //     }
    //
    //     const speechDevice = 'Alert ' + activeCounter + ' is from device ' + alert.deviceName.replace('-', ' ');
    //     const speechBearing = 'Direction is ' + compassDescription + ', ' + angleDescription;
    //     const speechDistance = 'Distance is ' + distanceDescription;
    //     const speechEta = 'Estimated time until arrival is ' + timeDescription;
    //
    //     const lineEnd = '\n'; // I find this is the best way to make sure the sentence ends well with a gap.
    //
    //     this.speech(speechDevice + lineEnd
    //         + speechEta + lineEnd
    //         + speechBearing + lineEnd
    //         + speechDistance + lineEnd
    //         + speechBearing + lineEnd
    //         + speechDistance + lineEnd)
    //       .then(() => {
    //         if (stateId === this.stateId) {
    //           // only when the id has remained the same may this continue on to the next alert
    //           // this is to avoid chained messages when a new alert comes in.
    //           describeNextAlert();
    //         }
    //       }).catch((reason: any) => console.log(reason));
    //   });
    //
    // };
    //
    await this.speech(speechCount);
  }
}
