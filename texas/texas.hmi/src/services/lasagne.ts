import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, Subject, timer} from 'rxjs';
import { Source } from '../enums/source';
import { TrackControl } from '../interfaces';
import { ConfigService } from './config';
import { ErrorService } from './error';
import {ToastController} from '@ionic/angular';

import {map} from 'rxjs/operators';

declare let taf: any;

export enum Channel {
  Tracks = 1,
  Alerts,
  Control,
  Report,
  Replay
}

/**
 * This service provides access to the TEXAS LasagneService.
 *
 * A channel is defined for each message that can be sent (i.e. Tracks = 1, Alerts = 2, etc.).
 *
 * Users of this class can:
 *   1. Subscribe to a channel using the "getChannel$" method
 *   2. Publish data to a channel using the "publish" method
 *
 * Internally, the class starts the TAFServer with the appropriate configuration
 * to start the TEXAS Lasagne Service. It also maintains a websocket connection to the service.
 */
@Injectable()
export class LasagneService {

  private static readonly CONNECTION_TRY_INTERVAL_MILLISECONDS: number = 1000;

  public static readonly CHANNELS: Array<number> = [
    Channel.Tracks,
    Channel.Alerts,
    Channel.Control,
    Channel.Report,
    Channel.Replay
  ];

  private rxSubjectMap: Map<number, Subject<any>> = new Map<number, Subject<any>>();
  private txSubjectMap: Map<number, Subject<any>> = new Map<number, Subject<any>>();

  private ws: WebSocket;

  private readonly connectionChangedSource: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public readonly connectionChanged$: Observable<boolean> = this.connectionChangedSource.asObservable();

  private lastToastMessage: HTMLIonToastElement = null;

  constructor(
    private config: ConfigService,
    private errorService: ErrorService,
    public toastCtrl: ToastController
  ) {

    // Initialise channels ready for subscription or publication
    LasagneService.CHANNELS.forEach(sub => {
      this.rxSubjectMap.set(sub, new Subject<any>());
      this.txSubjectMap.set(sub, new Subject<any>());

      // Add subscriber to send/receive data over the websocket
      this.txSubjectMap.get(sub).subscribe(data => {
        if (this.connectionReady() && (!this.config.settings.observer || sub !== 1)) {
          data.msgType = sub; // Add the message type field
          this.ws.send(JSON.stringify(data));
          console.log('Sent message over websocket', data);
        } else if (!this.config.settings.observer && this.ws !== undefined) {
          console.log('Cannot send data, websocket state: ' + this.ws.readyState);
        }
      });
    });

    this.config.configLoaded.then(() => {
      // Start the LASAGNE TAF Server
      if (typeof taf !== 'undefined') {
        taf.start(
          // success callback
          successData => console.log('Successfully started TAF Server', successData),
          // failure callback
          failureData => console.log('Failure to start TAF Server', failureData),
          // startup arguments
          ['TEXAS_TafServer', '-TAFProperties', '/data/user/0/dstg.lasagne.hmi/files/TEXAS_LasagneProperties.conf:texas', '-ACEDebug'],
          // configuration files
          ['TEXAS_DDS.ini', 'TEXAS_LasagneProperties.conf', 'TEXAS_TAFServer.conf']
        );
      } else {
        console.log('Could not get LASAGNE plugin :(');
      }

      // Setup automatic websocket re-connection on timer
      timer(2000, LasagneService.CONNECTION_TRY_INTERVAL_MILLISECONDS)
        .subscribe(() => {
          if (!this.connectionReady() && !this.connectionConnecting()) {

            // Attempt to connect to websocket
            console.log('Connecting to websocket: ' + this.config.settings.lasagneWebsocketUrl);
            try {
              this.ws = new WebSocket(this.config.settings.lasagneWebsocketUrl);
            } catch (err) {
              if (this.ws ) {
                this.ws.close();
              }
              this.errorService.log('Failed to establish connection to ' + this.config.settings.lasagneWebsocketUrl, true);
              throw err;
            }

            // Add "onopen" handler
            this.ws.onopen = ev => {
              console.log('Websocket - OPEN', ev);
              this.connectionChangedSource.next(this.connectionReady());
            };

            // Add "onclose" handler
            this.ws.onclose = ev => {
              console.log('Websocket - CLOSE', ev);
              this.connectionChangedSource.next(this.connectionReady());
            };

            // Add "onmessage" handler
            this.ws.onmessage = ev => this.handleMessage(ev);

            // Add "onerror" handler
            this.ws.onerror = ev => console.log('Websocket - ERROR', ev);
          }
        });
    });
  }

  /**
   * Get the observer for incoming messages
   * @param channel the channel to listen to
   * @param usePublishSource will return the observer for outgoing (published) messages, instead of incoming
   */
  getChannel$<T>(channel: number, usePublishSource?: boolean): Observable<T> {
    const subjectMap = usePublishSource ? this.txSubjectMap : this.rxSubjectMap;
    if (subjectMap.has(channel)) {
      return subjectMap.get(channel).asObservable().pipe(map(data => data as T));
    } else {
      const err = new Error('Attempted to get non-existent channel: ' + channel + ' (lasagne)');
      this.errorService.log(err.message);
      throw err;
    }
  }

  publish(channel: number, data: any): void {
    if (this.txSubjectMap.has(channel)) {
      return this.txSubjectMap.get(channel).next(data);
    } else {
      const err = new Error('Attempted to publish to non-existent channel: "' + channel + '" (lasagne)');
      this.errorService.log(err.message);
      throw err;
    }
  }

  private connectionReady(): boolean {
    return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
  }

  private connectionConnecting(): boolean {
    return this.ws !== undefined && this.ws.readyState === WebSocket.CONNECTING;
  }

  private async handleMessage(ev: any) {
    // Convert the json string into a javascript object
    const data = JSON.parse(ev.data);

    // Append the time that the information has been sent
    // NOT overriding the data.timestamp with Time of Reception
    // Just parsing the JSON date into a Date Object
    data.timestamp = new Date(data.timestamp);

    // Determine which type of message has been received and then handle appropriately
    switch (data.msgType) {

      case Channel.Tracks: // Tracks
        // Append source information to the data
        data.source = [Source.Lasagne]; // TODO is this still relevant ???

        console.log('received track', data);
        // Feed the received track to the subject, which subsequently multicasts to observers
        this.rxSubjectMap.get(Channel.Tracks).next(data);
        break;

      case Channel.Alerts: // Alerts
        // Update source information to the data
        data.source = Source.Lasagne; // TODO is this still relevant ???

        console.log('received alert', data);
        // Feed the received alert to the subject, which subsequently multicasts to observers
        this.rxSubjectMap.get(Channel.Alerts).next(data);
        break;

      case Channel.Control: // Control
        console.log('received control message', data);
        // Feed the received alert to the subject, which subsequently multicasts to observers
        this.rxSubjectMap.get(Channel.Control).next(data);

        const control: TrackControl = data;
        this.config.updateRemoteSettings(control);

        // Update the config directly - couldn't subscribe from the las services because of circular dependency?
        if (control.restart) {
          // Set a timeout to ensure this message gets logged locally.
          window.setTimeout(() => {
            console.log('Restarting the application...');
            (window as any).cordova.plugins.Restart.restart();
          }, 1000);
        }
        break;

      case Channel.Report: // Report
        this.errorService.log('Report received from LASAGNE service:' + data.message);

        if (this.lastToastMessage) {
          // dismiss last message to only allow there to be 1 report message at a time
          this.lastToastMessage.dismiss();
        }

        this.lastToastMessage = await this.toastCtrl.create({
          message: data.message,
          showCloseButton: true,
          closeButtonText: 'Ok',
          position: 'bottom',
          duration: 3000,
          color: 'success'
        });

        this.lastToastMessage.present();
        break;

      case Channel.Replay: // Replay
        console.log('received replay message', data);
        this.rxSubjectMap.get(Channel.Replay).next(data);
        break;

      default: // Unsupported Message Type
        // Received a message type that we do not currently handle
        this.errorService.log('unsupported message type: ' + data.msgType + ' data:' + data);
        break;
    }
  }
}
