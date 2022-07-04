import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ConfigService} from '../../services/config';
import {DisplayConfigService, DisplaySettings} from '../../services/display-config';
import {TrackManagerEvent, TrackManagerService} from '../../services/track-manager';
import {OwnTrackService} from '../../services/own-track';
import {ManualTrackService} from '../../services/manual-tracks';
import {QueryService} from '../../services/query';
import {HttpClient} from '@angular/common/http';
import {ContextualAlert, LatLon, Task, TaskEventDataType, Track} from '../../interfaces';
import {BehaviorSubject, interval, Observable, Subject, Subscription, throwError} from 'rxjs';
import {EventType} from '../../enums/event-type';
import {TrackRecord} from '../../classes/TrackRecord';
import {TrackMarker} from './track-marker';
import {TrackDetail} from './track-detail';
import {MapComponent} from 'ngx-openlayers';
import {MapBrowserEvent, proj} from 'openlayers';
import {Source} from '../../enums/source';
import * as _ from 'lodash';
import {LocationService} from '../../services/location';
import {ReplayService} from '../../services/replay';
import {isNullOrUndefined, isUndefined} from '../../functions/Utils';
import {ActionSheetController, AlertController, ModalController, ToastController} from '@ionic/angular';
import {UncertaintyZone} from '../../interfaces/UncertaintyZone';
import {catchError, map, throttle} from 'rxjs/operators';
import {PointAndBearing, TriangulationProvider} from '../../services/triangulation';
import {LatLonSpherical} from 'geodesy';
import {AlertMenuSettingsService} from '../../services/alert-menu-settings';
import {ActivatedRoute, Router} from '@angular/router';
import CMenu from 'circular-menu';
import {Select, Store} from '@ngxs/store';
import {AddContextualAlert} from '../../actions/contextual-alert.actions';
import {Guid} from 'guid-typescript';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {ContextualAlertService} from '../../services/contextual-alerts';
import {MissionDataService} from '../../services/mission-data.service';
import {RoleService} from "../../services/role.service";
import Feature = ol.Feature;
import {AddNewTaskComponent} from "../../components/add-new-task/add-new-task.component";
import {AddAlertLatLonComponent} from "../../components/add-alert-latlon/add-alert-lat-lon.component";

interface OlMarker {
  svg: string;
  position: LatLon;
  colour?: string;
  pinId?: string;
  data?: any;
}

interface OlLineMarker {
  coords: [number, number][];
  colour?: string;
}

export interface TriangulationData {
  pointAndBearing: PointAndBearing;
  line: LatLon[];
  active: boolean;
}

@Component({
  selector: 'page-map',
  templateUrl: 'map.html'
})
export class MapPage implements OnInit, OnDestroy {

  constructor(public config: ConfigService,
              private displayConfig: DisplayConfigService,
              private alertController: AlertController,
              public trackManager: TrackManagerService,
              private ownTrackService: OwnTrackService,
              private manualTracksService: ManualTrackService,
              private triangulation: TriangulationProvider,
              public toastCtrl: ToastController,
              private queryService: QueryService,
              private http: HttpClient,
              private location: LocationService,
              public replayService: ReplayService,
              private alertMenuSettingsService: AlertMenuSettingsService,
              private router: Router,
              private store: Store,
              private route: ActivatedRoute,
              private alertService: ContextualAlertService,
              private missionData: MissionDataService,
              private role: RoleService,
              public actionSheetController: ActionSheetController,
              public modalController: ModalController) {

    this.refreshTimer = (setInterval as any)(() => {

      this.prepareTrackMarker();
      this.prepareOwntrackMarker();

      if (this.isTriangulationMode()) {
        // Triangulation centre indication
        const centre = this.triangulation.getCentre(this.triangulationLines);
        if (centre != null) {
          if (this.triangulationCentreMarker === null) {
            this.triangulationCentreMarker = {svg: '', position: centre};
          } else {
            this.triangulationCentreMarker.position = centre;
          }
        } else {
          this.triangulationCentreMarker = null;
        }

        // Determine the triangulation zone.
        const triangulationZone: [number, number][]  = [];
        const centreOfTriangulation = new LatLonSpherical( 0,  0);

        let furthest = 0;
        let count = 0;

        // Get the current triangulation lines.
        const lines = _.values(this.triangulationLines).filter(line => line.active === true);

        if (lines.length > 0) {

          // First, iterate through the lines to see where the centre is.
          lines.forEach((line: TriangulationData) => {
            count++;
            centreOfTriangulation.lon += line.pointAndBearing.point.lon;
            centreOfTriangulation.lat += line.pointAndBearing.point.lat;
          });

          // Determine the centre as the average.
          centreOfTriangulation.lon = centreOfTriangulation.lon / count;
          centreOfTriangulation.lat = centreOfTriangulation.lat / count;

          // Iterate through the lines again to determine the furthest from the centre.
          lines.forEach((line: TriangulationData) => {
            const next = line.pointAndBearing.point.distanceTo(centreOfTriangulation);
            if (next > furthest) {
              furthest = next;
            }
          });

          // Now draw a circle from the averaged centre to the further radius.
          this.triangulationZone = this.createCircle(centreOfTriangulation, furthest);
        }

        this.prepareTriangulationLines();
        this.prepareTriangulationZone();
      }
    }, 1000);
  }

  private static mapLock = false; // this is used to check if the map is able to be initialized

  // ETA timers run every 15 seconds to query new values. The timer maps store the interval pointers.
  // These need to be torn-down when new new ETA timers are started, or when the details are removed from the map
  // ETA values are stored so that if something else updates the detail info, it can read from here
  private static readonly ETA_INTERVAL = 15000; // 15 seconds

  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;
  @ViewChild(MapComponent, { static: true }) map: MapComponent;


  private readonly trackMarkers: { [key: string]: TrackMarker } = {};

  ownshipPulseMarker: OlMarker = {svg: this.createOwnshipPulseMarker(), position: {lat: 0, lon: 0}};

  displaySettings: DisplaySettings;

  private alertActive = false;

  private alerts: Array<ContextualAlert> = [];
  private alertPins: { [key: string]: OlMarker } = {};
  private alertDetails: { [key: string]: TrackDetail } = {};
  private alertBadges: { [key: string]: OlMarker } = {};
  private alertDestinations: { [key: string]: OlMarker } = {};

  private uncertaintyZones: UncertaintyZone[] = [];

  // The track representing this device (provided by OwnTrackService)
  private owntrack: Track = null;
  sources: Source[];
  private manualPosition: boolean;

  private triangulationToastMessage: HTMLIonToastElement;
  private alertEtaTimers: { [key: string]: number } = {};
  private manualEtaTimers: { [key: string]: number } = {};
  private minimumEtaTimers: { [key: string]: number } = {};
  // self values is a map of etas for this track device (keyed by pinType+deviceId)
  // etas are stored humanreadable
  private etaSelfValues: { [key: string]: string } = {};
  // external values is for etas of other devices (first key: target deviceId, second key: source deviceName)
  // this map of maps is used to find the minimal eta
  // etas are stored as numbers, to be converted to human readable later (need to be comparable values)
  private etaExternalValues: { [key: string]: {[key: string]: number } } = {};
  pointsOfInterest = [];

  subscriptions = new Subscription();

  private readonly refreshTimer;
  private renderTimer;
  private historyTimer;
  private triangulationLines: {  [key: string]: TriangulationData  } = {};
  sourceEnum = Source;

  triangulationCentreMarker: OlMarker = null;

  addManualTrackEnabled = false;
  mapHeading = 0;

  triangulationRadius = 3000;
  activeTriangulationTracks = [];
  private triangulationZone: [number, number][] = [];

  addAlertEnabled = false;
  public displayAlertMenu = false; // Used to check whether the displayAlertMenu alertMenu is displayed
  alertMenu = null;
  menuToggle = true;
  addManualTackEnabled = false; // Used to check if Track can be placed on map
  alertMarkerPosition: LatLon = {lat: 0, lon: 0};

  alertPinsSub = new Subject<any>();
  alertPins$ = this.alertPinsSub.asObservable();

  alertDetailsSub = new Subject<any>();
  alertDetails$ = this.alertDetailsSub.asObservable();

  alertBadgesSub = new Subject<any>();
  alertBadges$ = this.alertBadgesSub.asObservable();

  alertDestinationsSub = new Subject<any>();
  alertDestinations$ = this.alertDestinationsSub.asObservable();

  alertBearingsSub = new Subject<any>();
  alertBearings$ = this.alertBearingsSub.asObservable();

  tracksSub = new Subject<any>();
  tracks$ = this.tracksSub.asObservable();

  ownTrackSub = new Subject<any>();
  ownTrack$ = this.ownTrackSub.asObservable();

  triangulationLinesSub = new Subject<any>();
  triangulationLines$ = this.triangulationLinesSub.asObservable();

  triangulationZoneSub = new BehaviorSubject<any>(this.triangulationZone);
  triangulationZone$ = this.triangulationZoneSub.asObservable();

  selectedTrack: Track = null;

  private static etaValueToHumanReadable(eta: number): string {
    let value = '?';

    if (eta !== undefined && eta !== null) {
      if (eta < 60) {
        // show value in seconds
        value = Math.round(eta) + ' sec';
      } else {
        eta = Math.round(eta / 60); // convert to minutes
        value = (eta % 60) + ' min';

        const hours = Math.floor(eta / 60);
        if (hours) {
          // prefix with hours
          value = hours + ' hr ' + value;
        }
      }
    }

    return value;
  }

  prepareOwntrackMarker() {
    this.ownTrackSub.next(_.values(this.trackMarkers).filter(marker => marker.trackIconSvg !== '' && marker.id === this.owntrack.deviceId));
  }

  prepareTrackMarker()  {
    const tracks = _.values(this.trackMarkers).filter(marker => marker.icon !== '' &&
      marker.id !== this.owntrack.deviceId && marker.isAlert === false);
    this.tracksSub.next(tracks);
  }

  getAlertAlertBearings() {

    const positions = [];

    Object.keys(this.alertPins)
      .filter(key => !isNullOrUndefined(this.alertDestinations[key]))
      .forEach((key) => {
        const alert =  this.alertPins[key];
        const destination = this.alertDestinations[key];
        positions.push([alert.position, destination.position]);
      });

    this.alertBearingsSub.next(positions);
  }

  private prepareTriangulationLines() {
    this.triangulationLinesSub.next(_.values(this.triangulationLines).filter(line => line.active === true));
  }

  private prepareTriangulationZone() {
      this.triangulationZoneSub.next(this.triangulationZone);
  }

  ngOnInit(): void {

    // TODO fix this.
    // this.renderTimer = (setInterval as any)(() => this.map.instance.render(), 0);

    // ------ Subscription: Settings -----
    this.subscriptions.add(this.config.settingsChanged$.subscribe(settings => {
      if (isNullOrUndefined(settings)) { return; }
      this.manualPosition = settings.developerMode === 'M';
    }));

    this.subscriptions.add(this.displayConfig.settingsChanged$.subscribe(settings => {
      const prevSettings = this.displaySettings || settings;
      this.displaySettings = settings;

      // clear ETA timers if necessary
      if (!this.displaySettings.alertEta) {
        Object.keys(this.alertEtaTimers).forEach(id => (clearInterval as any)(this.alertEtaTimers[id]));
        this.alertEtaTimers = {};
      }
      if (!this.displaySettings.manualEta) {
        Object.keys(this.manualEtaTimers).forEach(id => (clearInterval as any)(this.manualEtaTimers[id]));
        this.manualEtaTimers = {};
      }
      if (!this.displaySettings.minimumEta) {
        Object.keys(this.minimumEtaTimers).forEach(id => (clearInterval as any)(this.minimumEtaTimers[id]));
        this.minimumEtaTimers = {};
      }

      // update tracks
      if (prevSettings.markerBattery !== settings.markerBattery ||
        prevSettings.markerCategory !== settings.markerCategory ||
        prevSettings.markerId !== settings.markerId ||
        prevSettings.markerLastUpdate !== settings.markerLastUpdate ||
        prevSettings.source !== settings.source ||
        prevSettings.markerUpdateRate !== settings.markerUpdateRate) {

        this.trackManager.tracks.filter(t => !t.filtered)
          .map(t => t.getLatestTrack())
          .filter(t => this.isAsset(t))
          .filter(t => this.trackMarkers[t.deviceId])
          .filter(t => this.trackMarkers[t.deviceId].detail)
          .forEach(t => this.trackMarkers[t.deviceId].detail.replaceInfo(this.createInfo(t)));
      }

      // update manual tracks
      if (prevSettings.manualDevice !== settings.manualDevice ||
          prevSettings.manualEta !== settings.manualEta ||
          prevSettings.minimumEta !== settings.minimumEta ||
          prevSettings.manualId !== settings.manualId) {

        this.trackManager.tracks.filter(t => !t.filtered)
          .map(t => t.getLatestTrack())
          .filter(t => this.isManual(t))
          .filter(t => this.trackMarkers[t.deviceId])
          .filter(t => this.trackMarkers[t.deviceId].detail)
          .forEach(t => this.trackMarkers[t.deviceId].detail.replaceInfo(this.createInfo(t)));
      }

      // update alerts
      if (prevSettings.alertDevice !== settings.alertDevice ||
          prevSettings.alertEta !== settings.alertEta ||
          prevSettings.minimumEta !== settings.minimumEta) {

        this.alerts.filter(a => a.active)
          .forEach(a => {
            // Manage when the detail is required to be re-added
            const detail = this.alertDetails[a.id];

            // Note: both will of type boolean
            if (this.isAlertDetailShown() === Boolean(detail)) {
              // Detail does not need to be added/removed
              if (detail) {
                // Modify the existing details
                detail.replaceInfo(this.createInfo(a));
              }
            } else {
              if (detail) {
                // remove detail
                delete this.alertDetails[a.id];
              } else {
                // add detail
                this.alertDetails[a.id] = new TrackDetail(a.position, a.id, this.createInfo(a));
              }
            }
          });
      }
    }));

    // ------ Subscription: Own Track -----

    // On own track changed, update the local cache with the new value
    this.subscriptions.add(this.ownTrackService.ownTrackChanged$.subscribe(track =>  {
      this.owntrack = track;
      this.sources = _.cloneDeep(this.owntrack.source);
      if (this.config.settings.maplockOwntrack && this.map.instance !== undefined) {
        const lonlat = proj.transform([this.owntrack.position.lon, this.owntrack.position.lat], 'EPSG:4326', 'EPSG:3857');
        this.map.instance.getView().setCenter(lonlat);
      }
    }));

    const initMap = () => {
      MapPage.mapLock = true;

      this.map.instance.updateSize();

      // ------ Subscription: Tracks ------

      this.subscriptions.add(this.trackManager.trackChange$.subscribe((e: TrackManagerEvent) => {

        switch (e.eventType) {
          case EventType.ADDED:
          case EventType.UPDATED:
            if (!e.trackRecord.filtered) {
              this.updateMarker(e.trackRecord.getLatestTrack(), undefined);
              const latestTrack = e.trackRecord.getLatestTrack();
              this.checkTriangulation(latestTrack);
            } else {
              this.removeMarker(e.trackRecord.getLatestTrack().deviceId);
            }

            this.updateUncertaintyZone(e.trackRecord);
            break;
          case EventType.REMOVED:
            this.removeMarker(e.trackRecord.getLatestTrack().deviceId);

            this.updateUncertaintyZone(e.trackRecord);
            break;
        }
      }));

      // ------ Subscription: Alerts ------
      this.alertMenuSettingsService.getSettings().then(settings => {
        this.subscriptions.add(this.alerts$.subscribe((alerts: Array<ContextualAlert>) => {
          // update alert active if self alert has been added with position.
          // Note: active field is not checked as this will always be false for the local device's
          const selfAlert = alerts.find(a => a.ownerDeviceId === this.owntrack.deviceId);
          this.alertActive = selfAlert ? Boolean(selfAlert.position) : false;

          this.alerts = alerts;
          alerts.forEach((alert: ContextualAlert) => this.updateMarker(undefined, alert));
          this.updateAlertPins(alerts, settings);
        }));
      });



      // ------ Subscription: Points of interest ------

      this.subscriptions.add(this.getPointsOfInterest().subscribe((data: any) => {
        if (data.hasOwnProperty('pointsOfInterest')) {
          this.pointsOfInterest = data.pointsOfInterest;
        }
      }));

      this.subscriptions.add(this.location.headingChange$.pipe(throttle(ev => interval(250))).subscribe((heading: number) => {
        if (this.config.settings.maptrackUp) {
          this.mapHeading = -heading * (Math.PI / 180);
        } else {
          this.mapHeading = 0;
        }
      }));

      // Add ownship marker.
      this.createOwnshipPulseMarker();
    };

    if (MapPage.mapLock || isUndefined(this.map.instance)) {
      // check every 250ms until other page is destroyed
      const timer = (setInterval as any)(() => {
        if (MapPage.mapLock === false && !isUndefined(this.map.instance)) {
          // stop interval and start map
          clearInterval(timer);
          initMap();
        }
      }, 250);
    } else {
      initMap();
    }

    this.route.params.subscribe( (params) => {
      setTimeout(() => {
        if (params.hasOwnProperty('lat') && params.hasOwnProperty('lon') && !isNullOrUndefined(this.map.instance)) {
        const lat = Number(params.lat);
        const lon = Number(params.lon);

        const location = proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
        const view = this.map.instance.getView();

        view.animate({
          center: location
        });
      }
      }, 100);
    });
  }

  private updateUncertaintyZone(trackRecord: TrackRecord) {

    // If the accuracy is undefined or thr track is filtered then remove.
    if (trackRecord.getLatestTrack().posAccuracy === undefined ||
       (trackRecord.getLatestTrack().deviceId !== this.owntrack.deviceId && trackRecord.filtered)) {
      // Remove the zone if it exists.
      this.uncertaintyZones = this.uncertaintyZones.filter(zone => zone.deviceId !== trackRecord.getLatestTrack().deviceId);
    } else {

      const track = trackRecord.getLatestTrack();
      // Search for existing zone.
      const existingZone = this.uncertaintyZones.find(zone => zone.deviceId === trackRecord.getLatestTrack().deviceId);
      const centre = new LatLonSpherical(track.position.lat, track.position.lon);
      if (existingZone !== undefined) {
        if (existingZone.posAccuracy !== track.posAccuracy ||  existingZone.centre !== centre) {
          // Update if the position accuracy has changes.
          existingZone.zone = this.createCircle(centre, track.posAccuracy);
          existingZone.centre = centre;
          existingZone.posAccuracy = track.posAccuracy;
        }
      } else {
        // Add a new zone.
        this.uncertaintyZones.push( {
          zone:  this.createCircle(centre, track.posAccuracy),
          posAccuracy: track.posAccuracy,
          deviceId: trackRecord.getLatestTrack().deviceId,
          centre
        });
      }
    }
  }

  private createCircle(centre, radius): [number, number][] {
    const numPoints = 18;
    const circle: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      const point = centre.destinationPoint(radius, i * 360.0 / numPoints);
      circle.push([point.lon, point.lat]);
    }
    circle.push([circle[0][0], circle[0][1]]);
    return circle;
  }

  private createOwnshipPulseMarker(): string {
    const radius = 10;
    const svgHtmlBody = `width="${radius * 3.0}" height="${radius * 3.0}" version="1.1" xmlns="http://www.w3.org/2000/svg"`;
    const shapeHtml = `<circle cx="${radius * 1.50}" cy="${radius * 1.50}" r="${radius}" stroke="orange" stroke-width="3" fill="none">
      <animate attributeName="r" begin="0s" dur="0.5s" repeatCount="indefinite" from="${radius}" to="${radius * 1.50}"/>
      <animate attributeName="opacity" begin="0s" dur="0.5s" repeatCount="indefinite" from="1" to="0"/>
      </circle>`;

    return `data:image/svg+xml;utf8,<svg ${svgHtmlBody}>${shapeHtml}</svg>`;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    clearInterval(this.refreshTimer);
    clearInterval(this.renderTimer);
    clearInterval(this.historyTimer);

    Object.keys(this.alertEtaTimers).forEach(i => (clearInterval as any)(this.alertEtaTimers[i]));
    Object.keys(this.manualEtaTimers).forEach(i => (clearInterval as any)(this.manualEtaTimers[i]));
    Object.keys(this.minimumEtaTimers).forEach(i => (clearInterval as any)(this.minimumEtaTimers[i]));

    // clean up from triangulation mode
    if (this.triangulationToastMessage) {
      this.triangulationToastMessage.dismiss();
    }

    // free up lock resource
    MapPage.mapLock = false;
  }

  private checkTriangulation(latestTrack: Track) {
    if (this.isTriangulationMode() &&  latestTrack.primarySource === Source.Lasagne) {

      const trackPosition = new LatLonSpherical(latestTrack.position.lat, latestTrack.position.lon);
      const ownPosition = new LatLonSpherical(this.owntrack.position.lat, this.owntrack.position.lon);
      const endPoint = trackPosition.destinationPoint(this.triangulationRadius, latestTrack.heading);

      const pointAndBearing: PointAndBearing = {
      point: trackPosition,
      bearing: latestTrack.heading
      };

      if (!isNaN(trackPosition.lat) && !isNaN(trackPosition.lon) && !isNaN(endPoint.lat) && !isNaN(endPoint.lon)) {
        const pointList = [{lat: endPoint.lat, lon: endPoint.lon}, {lat: trackPosition.lat, lon: trackPosition.lon}];

        if (this.triangulationLines[latestTrack.deviceId] === undefined && this.activeTriangulationTracks.includes(latestTrack.deviceId)) {
          this.triangulationLines[latestTrack.deviceId] = {
            line: pointList,
            pointAndBearing,
            active: true
          };
        } else if (this.activeTriangulationTracks.includes(latestTrack.deviceId)) {
          this.triangulationLines[latestTrack.deviceId].pointAndBearing = pointAndBearing;
          this.triangulationLines[latestTrack.deviceId].line = pointList;
          // if line is not active, set to active and add to map
          if (!this.triangulationLines[latestTrack.deviceId].active) {
            this.triangulationLines[latestTrack.deviceId].active = true;
          }
        }
      }
    }
  }

  private getPointsOfInterest(): Observable<any> {
    return this.http.get('./assets/points-of-interest.json').pipe(
      map((res: any) => res),
      catchError((error => throwError(error))));
  }

  private removeMarker(deviceId: string) {

    if (this.trackMarkers[deviceId] !== undefined) {
      delete this.trackMarkers[deviceId];
    }

    // remove triangulation line from map (and set as not active)
    if (this.triangulationLines[deviceId] && this.triangulationLines[deviceId].active) {
      this.triangulationLines[deviceId].active = false;
    }
  }

  private updateMarker(track: Track, alert: ContextualAlert) {
    const deviceId: string = track ? track.deviceId : alert.id + '_alert';
    const deviceName: string = track ? track.deviceName : alert.id ;

    if (this.trackMarkers[deviceId] === undefined) {
      if (track) {
        this.trackMarkers[deviceId] = new TrackMarker(this.manualTracksService, deviceId === this.owntrack.deviceId, false);
      }
    }

    if (track) {
      // provide the new info
      this.trackMarkers[deviceId].setInfo(this.createInfo(track));
    }

    if (track) {
      this.trackMarkers[deviceId].updateTrack(track);
    }
    if (alert) {
      if (this.trackMarkers[alert.id] !== undefined) {
        this.trackMarkers[alert.id].updateAlert(alert);
      }
    }

    if (track && deviceId === this.owntrack.deviceId) {
      this.ownshipPulseMarker.position = track.position;
    }
  }

  private createInfo(t: Track | ContextualAlert) {
    const info: any = {};
    if ((t as any).type) {
      const track = t as Track;

      // DEVICE TRACK
      if (this.isAsset(track)) {
        info.title = track.deviceName;
        if (this.displaySettings.markerId) {
          info.ID = track.deviceId;
        }
        if (this.displaySettings.markerCategory) {
          const cat = this.config.categories[track.categoryId];
          info.Category = cat ? cat.categoryName : '';
        }
        if (this.displaySettings.markerBattery) {
          info.Power = track.battery + '%';
        }
        if (this.displaySettings.markerUpdateRate) {
          info.Rate = track.updateRate === 0 ? 'Auto' : (track.updateRate + 'ms');
        }
        if (this.displaySettings.markerLastUpdate) {
          info.Timestamp = track.timestamp.toLocaleTimeString();
        }

        if (this.displaySettings.source) {
          info.Sources = '';
          track.source.forEach((source => {
            info.Sources += `${Source[source]}, `;
          }));
          info.Sources = info.Sources.substring(0, info.Sources.length - 2);
        }
      } else if (this.isManual(track)) {
        info.title = track.type === 'TRI' ? 'Triangulation' : 'Manual Track';
        if (this.displaySettings.manualId) {
          info.ID = track.deviceId;
        }
        if (this.displaySettings.manualDevice) {
          info.Device = ManualTrackService.getDeviceNameForManualTrack(track);
        }
        if (this.displaySettings.manualEta) {
          info.ETA = this.getEtaValue(track.deviceId, 'manual');
        }
        if (this.displaySettings.minimumEta) {
          info['Min ETA'] = this.getMinimumTrackEta(track.deviceId, 'manual');
        }
      }

    } else {
      const alert = t as ContextualAlert;
      info.title = 'Alert';
      if (this.displaySettings.alertDevice) {
        const track = this.trackManager.tracks.find(track => track.getLatestTrack().deviceId === alert.ownerDeviceId);
        if (track !== null && track !== undefined) {
          info.Device = track.getLatestTrack().deviceName;
        }
      }
      if (this.displaySettings.alertEta) {
        info.ETA = this.getEtaValue(alert.id, 'alert');
      }
      if (this.displaySettings.minimumEta) {
        info['Min ETA'] = this.getMinimumTrackEta(alert.id, 'alert');
      }
    }

    return info;
  }

  private isAsset(track: Track): boolean {
    return track.type === 'ASSET';
  }

  private isManual(track: Track): boolean {
    return track.type === 'MAN' || track.type === 'TRI';
  }

  private isAlertDetailShown(): boolean {
    // at least 1 alert value is set
    // must be of type boolean
    return Boolean(this.displaySettings && (this.displaySettings.alertDevice || this.displaySettings.alertEta));
  }

  // Loads Alert Icon or uses default
  private updateAlertPins(alerts: Array<ContextualAlert>, settings) {

    this.alertPins = {};
    this.alertDetails = {};
    const alertBadges = [];
    this.alertDestinations = {};

    const defaultIcon = `data:image/svg+xml;utf8,<svg width="39.99999999999999" height="60" xmlns="http://www.w3.org/2000/svg">
 <g>
  <g stroke="null" id="svg_1">
   <g stroke="null" id="svg_2">
    <g stroke="null" id="svg_3">
     <path stroke="null" id="svg_4" fill="#D80027" d="m18.389978,13.555101l2.579099,0l-0.35648,7.293823l-1.862423,0l-0.360196,-7.293823zm1.288168,8.093658c-0.862812,0 -1.464979,0.597762 -1.464979,1.46649c0,0.833765 0.584544,1.460099 1.435257,1.460099l0.028865,0c0.883294,0 1.453833,-0.62718 1.453833,-1.460099c-0.014957,-0.868634 -0.585496,-1.46649 -1.452976,-1.46649zm19.22926,-2.898957c0,10.481228 -19.235834,41.260889 -19.235834,41.260889s-19.235834,-30.778721 -19.235834,-41.260889c0,-10.478408 8.613161,-18.977999 19.235834,-18.977999c10.620863,0.00094 19.235834,8.499591 19.235834,18.977999zm-4.357785,0c0,-8.097324 -6.673478,-14.682291 -14.878049,-14.682291c-8.206476,0 -14.883669,6.584967 -14.883669,14.682291c0,8.091872 6.677193,14.684171 14.883669,14.684171c8.204571,0 14.878049,-6.591452 14.878049,-14.684171zm-3.512597,8.245166c-0.267122,0.437983 -0.747351,0.703404 -1.263971,0.703404l-20.201912,0c-0.533291,0 -1.025714,-0.280083 -1.286263,-0.739213c-0.262454,-0.456404 -0.256929,-1.016571 0.016767,-1.46649l10.134061,-17.740181c0.268075,-0.443528 0.750209,-0.712615 1.272354,-0.712615l0.035343,0.00188c0.536149,0.009211 1.023809,0.312227 1.270449,0.779628l10.0689,17.741967c0.240924,0.450953 0.221395,0.995424 -0.045727,1.431621zm-1.263018,-0.753875l-10.066994,-17.741967l-10.135871,17.741967c0,0 20.202865,0 20.202865,0z"/>
    </g>
   </g>
  </g>
 </g>
</svg>`;

    // Add marker for active alert to array and to the map
    alerts.filter(a => a.active).forEach(async a => {

      const redCrossSvg = 'data:image/svg+xml;utf8,<svg width="16" height="16" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
        '<rect fill="red" height="6" width="16" y="5" x="0"/>\n' +
        '<rect fill="red" height="16" width="6" y="0" x="5"/>' +
        '</svg>';

      // Get the icon.
      const icon = settings[a.primaryInfo].subMenu[a.secondaryInfo].image;

      if (icon === undefined) {
        this.alertPins[a.id] = {svg: defaultIcon, position: a.position, pinId: a.id};
        if (this.isAlertDetailShown()) {
          this.alertDetails[a.id] = new TrackDetail(a.position, a.id, this.createInfo(a));
        }
      } else {
        this.alertPins[a.id] = {svg: 'data:image/svg+xml,' + encodeURIComponent(icon), position: a.position, pinId: a.id};

        if (this.isAlertDetailShown()) {
          this.alertDetails[a.id] = new TrackDetail(a.position, a.id, this.createInfo(a));
        }

        if (!isNullOrUndefined(a.incidentReport)) {
          if (isNullOrUndefined(a.incidentReport.rescueLocation) === false) {
            this.alertDestinations[a.id] = {svg: redCrossSvg, position: a.incidentReport.rescueLocation.position, pinId: a.id};
          }
          const badgeNumbers = [];
          if (isNullOrUndefined(a.incidentReport.identifiedPersonCount) === false) {
            badgeNumbers.push({
              count: a.incidentReport.identifiedPersonCount,
              colour: a.incidentReport.identifiedPersonCount === 0 ? 'success' : 'danger'
            });
          }
          if (isNullOrUndefined(a.incidentReport.expectedMissionPersonCount) === false) {
            badgeNumbers.push({
              count: a.incidentReport.expectedMissionPersonCount,
              colour: 'warning'
            });
          }

          if (badgeNumbers.length > 0) {
            alertBadges.push({position: a.position, pinId: a.id, data: badgeNumbers});
          }

          if (isNullOrUndefined(a.incidentReport.rescuedPersonCount) === false && isNullOrUndefined(a.incidentReport.rescueLocation) === false) {
            alertBadges.push({position: a.incidentReport.rescueLocation.position, pinId: a.id, data: [{
                count: a.incidentReport.rescuedPersonCount,
                colour: !isNullOrUndefined(a.incidentReport.expectedMissionPersonCount)
                && a.incidentReport.rescuedPersonCount === a.incidentReport.expectedMissionPersonCount ? 'success' : 'danger'
              }]});
          }
        }
      }
    });

    // Add marker for local alert
    const selfAlert = alerts.find(a => a.id === this.owntrack.deviceId);
    if (selfAlert && selfAlert.position) {
      this.alertPins[selfAlert.id] = {svg: defaultIcon, position: selfAlert.position, pinId: selfAlert.id};
    }

    this.getAlertAlertBearings();

    this.alertDestinationsSub.next(_.cloneDeep(_.values(this.alertDestinations)));
    this.alertBadgesSub.next(alertBadges);
    this.alertDetailsSub.next(_.cloneDeep(_.values(this.alertDetails)));
    this.alertPinsSub.next(_.cloneDeep(_.values(this.alertPins)));
  }

  public triangulationToggle() {
    this.triangulation.switchEnabled();
    if (this.isTriangulationMode()) {
      this.showTriangulationRunningMessage();
      // TRIANGULATION ON
      // restore for triangulation mode
      // put the active lines back on the map
      Object.keys(this.triangulationLines)
        .filter(key => this.triangulationLines[key].active)
        .forEach((key) => {
          this.triangulationLines[key].active = true;
        });
      // check triangulation
      this.trackManager.tracks.filter(t => !t.filtered)
        .map(t => t.getLatestTrack())
        .filter(t => t.active)
        .forEach(t => this.checkTriangulation(t));

    } else {
      // TRIANGULATION OFF`
      // remove triangulation message
      if (this.triangulationToastMessage) {
        this.triangulationToastMessage.dismiss();
      }

      Object.keys(this.triangulationLines)
        .filter(key => this.triangulationLines[key].active)
        .forEach((key) => {
          this.triangulationLines[key].active = false;
        });
    }
  }

  private async showTriangulationRunningMessage() {
    this.triangulationToastMessage = await this.toastCtrl.create({
      message: 'Triangulation mode enabled',
      showCloseButton: true,
      closeButtonText: 'Ok',
      position: 'top'
    });

    this.triangulationToastMessage.present();
  }

  private getEtaValue(deviceId: string, pinType: string): string {
    this.checkEtaTimer(deviceId, pinType);
    const eta = this.etaSelfValues[pinType + deviceId];
    return eta || '';
  }

  // SELF ETA METHODS (checking this device's Eta for alerts or manual tracks)

  private checkEtaTimer(deviceId: string, pinType: string): void {
    if (pinType !== 'alert' && pinType !== 'manual') {
      throw pinType;
    }

    const timerList = 'alert' ? this.alertEtaTimers : this.manualEtaTimers;

    if (timerList[deviceId]) {
      // timer exists
      return;
    }

    const requestEta = () => {
      let marker: any;
      if (pinType === 'manual') {
        marker = this.trackMarkers[deviceId];
      }
      if (pinType === 'alert') {
        marker = this.alertPins[deviceId];
      }

      if (marker) {
        const destination = marker.position;
        const type = this.config.categories[this.owntrack.categoryId || 0].abbreviation;
        this.queryService.getEta(this.owntrack.position, destination, type).subscribe(data => processEta(data.eta));
      }

      this.alertDetailsSub.next(_.cloneDeep(_.values(this.alertDetails)));
    };

    const processEta = (eta: number) => {

      let detail: TrackDetail;

      try {
        if (pinType === 'manual' && this.displaySettings.manualEta) {
          detail = this.trackMarkers[deviceId].detail;
        }
        if (pinType === 'alert' && this.displaySettings.alertEta) {
          detail = this.alertDetails[deviceId];
        }
      } catch (exception) {
        // unable to get detail (this marker/alert has expired)
      }

      if (!detail) {
        // clear timer
        const timer = timerList[deviceId];
        if (timer) {
          (clearInterval as any)(timer);
        }
        delete timerList[deviceId];
        return;
      }

      const value = MapPage.etaValueToHumanReadable(eta);
      this.etaSelfValues[pinType + deviceId] = value;
      detail.updateInfo({ETA: value});
    };

    const prevTimer = timerList[deviceId];
    if (prevTimer) {
      (clearInterval as any)(prevTimer);
    }

    timerList[deviceId] = (setInterval as any)(() => requestEta(), MapPage.ETA_INTERVAL);

    // must do initial request after markers are set up:
    (setTimeout as any)(() => requestEta(), 250);
  }

  // MINIMUM ETA METHODS (for checking all devices and finding the closest)

  private getMinimumTrackEta(deviceId: string, pinType: string): string {
    this.checkMinimumEtaTimers(deviceId, pinType);
    return this.calculateMinimumTrackEta(deviceId, pinType);
  }

  private calculateMinimumTrackEta(deviceId: string, pinType: string): string {
        const etaMap: {[key: string]: number } = this.etaExternalValues[deviceId];
        // reduce the list of keys by which has the lowest Eta
        const minimumTrack = Object.keys(etaMap).reduce((prevTrack: string, nextTrack: string) => {
          if (prevTrack === null) {
            // null value is for initial case
            return nextTrack;
          }
          const nextEta = etaMap[nextTrack];
          const prevEta = etaMap[prevTrack];
          // Check if ETAs are real (query service could have returned undefined)
          if (!nextEta) { return prevTrack; }
          if (!prevEta) { return nextTrack; }
          return nextEta < prevEta ? nextTrack : prevTrack;
        }, null);
        if (minimumTrack) {
          const eta: number = etaMap[minimumTrack];
          if (eta === undefined || eta === null) {
            // there is no valid eta returned
            return '?';
          } else {
            const value = MapPage.etaValueToHumanReadable(eta);
            return minimumTrack + ' (' + value + ')';
          }
        } else {
          // no value returned yet
          return '';
        }
  }

  private checkMinimumEtaTimers(deviceId: string, pinType: string): void {
    if (pinType !== 'alert' && pinType !== 'manual') {
      throw pinType;
    }

    // get eta map (keyed by deviceId, returns eta value)
    const etaMap = this.etaExternalValues[deviceId] || {};
    this.etaExternalValues[deviceId] = etaMap;

    if (this.minimumEtaTimers[deviceId]) {
      // timer exists
      return;
    }

    const requestEta = () => {
      let marker: any;
      if (pinType === 'manual') {
        marker = this.trackMarkers[deviceId];
      }
      if (pinType === 'alert') {
        marker = this.alertPins[deviceId];
      }

      if (marker) {
        const destination = marker.position;
        let delay = 0;
        this.trackManager.tracks.filter(record => !record.filtered)
          .map(record => record.getLatestTrack())
          .filter(track => !this.isManual(track))
          .forEach((track: Track) => {
            const type = this.config.categories[track.categoryId || 0].abbreviation;
            // call the query service to get the eta but just delay each call
            (setTimeout as any)(() => {
              this.queryService.getEta(track.position, destination, type).subscribe(data => processEta(track, data.eta));
            }, delay += 25);
        });
      }
    };

    const processEta = (track: Track, eta: number) => {

      let detail: TrackDetail;

      try {
        if (this.displaySettings.minimumEta) {
          if (pinType === 'manual') {
            detail = this.trackMarkers[deviceId].detail;
          }
          if (pinType === 'alert') {
            detail = this.alertDetails[deviceId];
          }
        }
      } catch (exception) {
        // unable to get detail (this marker/alert has expired)
      }

      if (!detail) {
        // clear timer
        const timer = this.minimumEtaTimers[deviceId];
        if (timer) {
          (clearInterval as any)(timer);
        }
        this.minimumEtaTimers[deviceId] = undefined;
        return;
      }

      // put Eta in map (use device name, better for reading)
      etaMap[track.deviceName] = eta;
      // re-calculate minimum track eta and update detail
      detail.updateInfo({'Min ETA': this.calculateMinimumTrackEta(deviceId, pinType)});
    };

    const prevTimer = this.minimumEtaTimers[deviceId];
    if (prevTimer) {
      (clearInterval as any)(prevTimer);
    }

    this.minimumEtaTimers[deviceId] = (setInterval as any)(() => requestEta(), MapPage.ETA_INTERVAL);

    // must do initial request after markers are set up:
    (setTimeout as any)(() => requestEta(), 250);
  }

  public isTriangulationMode(): boolean {
    return this.triangulation.enabled;
  }

  selectSource(source: Source) {
    // TODO should this set it in settings instead?
    this.ownTrackService.updatePrimarySource(source);
  }

  public mapClick(click: MapBrowserEvent) {
    // See here: https://stackoverflow.com/questions/45591094/openlayers-feature-selection-area-is-offset
    this.map.instance.updateSize();

    if (this.addAlertEnabled) {
      // Convert position clicked to lonLat
      const toLonLat = proj.toLonLat(click.map.getCoordinateFromPixel(click.pixel)); // , 'EPSG:3857', 'EPSG:4326');
      this.alertMarkerPosition.lat = toLonLat[1];
      this.alertMarkerPosition.lon = toLonLat[0];
      this.placeAlert(toLonLat);
    } else if (this.addManualTrackEnabled) {
      const lonLat = proj.toLonLat( click.map.getCoordinateFromPixel(click.pixel)); // , 'EPSG:3857', 'EPSG:4326');
      this.manualTracksService.addManualTrack({lat: lonLat[1], lon: lonLat[0]}, this.isTriangulationMode() ? 'TRI' : undefined);
      this.addManualTrackEnabled = false;
    } else {
      this.featureSelection(click);
    }
  }

  // Check position for feature and delete
  public featureSelection(click: MapBrowserEvent) {

    this.selectedTrack = null;

    click.map.forEachFeatureAtPixel(click.pixel, async (feature: Feature) => {
      const featureId: string = feature.getId() as string;
      // Remove manual track
      if (this.manualTracksService.contains(featureId)) {
        const alert =  await this.alertController.create({
          header: 'Remove Manual Track?',
          message: 'Are you sure you wish to remove the selected manual track?',
          buttons: [
            {
              text: 'No'
            }, {
              text: 'Yes',
              handler: () => {
                this.manualTracksService.removeManualTrack(featureId);
              }
            }
          ]
        });

        alert.present();
        // Triangulation
      } else if (this.trackManager.contains(featureId) && this.isTriangulationMode()) {
          const tracks = this.trackManager.tracks.filter(t => t.getLatestTrack().deviceId === featureId);
          tracks.forEach((track: TrackRecord) => {
            if (track.getLatestTrack().source.includes(Source.Lasagne)) {
              if (this.activeTriangulationTracks.includes(featureId)) {
                console.log('REMOVING LAS TRACK');
                const index = this.activeTriangulationTracks.indexOf(featureId);
                if (index > -1) {
                  this.activeTriangulationTracks.splice(index, 1);
                  if (this.triangulationLines[featureId] !== undefined) {
                    this.triangulationLines[featureId].active = false;
                  }
                  this.checkTriangulation(track.getLatestTrack());
                }
              } else {
                this.activeTriangulationTracks.push(featureId);
                this.checkTriangulation(track.getLatestTrack());
              }
            }
          });

        this.prepareTriangulationLines();
        } else if (this.trackManager.contains(featureId)) {

            const tracks = this.trackManager.tracks.filter(t => t.getLatestTrack().deviceId === featureId);
            if (!isNullOrUndefined(tracks) && tracks.length > 0) {
              this.selectedTrack = tracks[0].getLatestTrack();
              console.log('setting track to ' + JSON.stringify(this.selectedTrack))
            }

        } else if (this.alerts.find(a => a.id === featureId) !== undefined) {

        // TODO ok so I hate putting this inside a timeout. On the phone it seems that the action sheet gets gobbled
        // up by the same click event that shows it??? I have tried click.stopPropagation() without luck.
        setTimeout(async () => {
          // Show Action Sheet.
          await this.alertService.displayAlertOptions(this.alerts.find(a => a.id === featureId), true);
        }, 100);
      }
    }, {
      hitTolerance: 5
    });
  }

  public toggleAddManualTrack() {
    this.addManualTrackEnabled = !this.addManualTrackEnabled;
    this.addAlertEnabled = false;
  }

  // Toggle alert
  public async toggleAddManualAlert() {
    this.addAlertEnabled = !this.addAlertEnabled;

    // Show displayAlertMenu if placing alert
    if (this.addAlertEnabled === false) {
      if (this.alertMenu != null) {
        this.alertMenu.hide();
      }
      this.displayAlertMenu = false;
    }
    if (this.addAlertEnabled === true) {

      let selectLocation = 'unset';

      const actionSheet = await this.actionSheetController.create({
        header: 'Alert Location',
        buttons: [{
          text: 'My Location',
          icon: 'navigate',
          handler: () => {
            selectLocation = 'false';
          }
        },
          {
            text: 'Select Location',
            icon: 'locate',
            handler: () => {
              selectLocation = 'true';
            }
          },
          {
            text: 'Enter Lat/Lon',
            icon: 'more',
            handler: async () => {
              const modal = await this.modalController.create({
                component: AddAlertLatLonComponent
              });

              await modal.present();
              const { data } = await modal.onWillDismiss();

              if(!isNullOrUndefined(data) && !isNullOrUndefined(data.lat) && !isNullOrUndefined(data.lon)) {
                this.alertMarkerPosition.lat = Number(data.lat);
                this.alertMarkerPosition.lon = Number(data.lon);
                selectLocation = 'latLon';
              }
            }
          }]
      });

      await actionSheet.present();
      actionSheet.onDidDismiss().then(() => {

        if(selectLocation === 'latLon') {
          this.menuToggle = true;
          this.placeAlert([this.alertMarkerPosition.lon, this.alertMarkerPosition.lat]);
        } else if(selectLocation === 'true') {
          this.menuToggle = true;
        }
        else if(selectLocation === 'false') {
          this.menuToggle = true;
          this.alertMarkerPosition.lat = this.owntrack.position.lat;
          this.alertMarkerPosition.lon = this.owntrack.position.lon;
          this.placeAlert([this.alertMarkerPosition.lon, this.alertMarkerPosition.lat]);
        } else {
          this.addAlertEnabled = false;
        }

        // Unlock the map lock so the menu can move to the centre.
        this.config.settings.maplockOwntrack = false;
      });
    }
    this.addManualTackEnabled = false;
  }

  // If placing an alert, bring up displayAlertMenu alertMenu
  public async placeAlert(latLon: [number, number]) {
    if (this.addAlertEnabled) {

      // Pan to location
      const location = proj.transform([latLon[0], latLon[1]], 'EPSG:4326', 'EPSG:3857');
      const view = this.map.instance.getView();

      // Create displayAlertMenu + send Alert data
      if (this.alertMenu == null) {
        await this.createAlertMenu();
      }

      if (this.menuToggle === true) {
        view.animate({
          center: location,
          duration: 250
        }, () => {
          if (this.menuToggle === true) {
            const pixels = this.map.instance.getPixelFromCoordinate(location);
            // pixels[1] += 50;
            this.alertMenu.show(pixels);
            this.displayAlertMenu = true;
            this.menuToggle = false;
          }
        });
      } else {
        this.displayAlertMenu = false;
        this.alertMenu.hide();
        this.addAlertEnabled = false;
      }
    }
  }

  // Create Alert Menu and calls confirmation function
  public async createAlertMenu() {
    const alertData = await this.alertMenuSettingsService.getSettings();
    this.alertMenu = CMenu('#alertMenuDiv');
    const menuData = [];

    const doConfirm = (x: number, y: number) => {
      this.confirmAlert(x, y);
    };

    for (let i = 0; i < alertData.length; i++) {
      const subData = [];

      for (let j = 0; j < alertData[i].subMenu.length; j++) {
        subData.push({
          title: alertData[i].subMenu[j].secOpt,
          click: () => {
            doConfirm(i, j);
          }
        });
      }

      menuData.push({title: alertData[i].mainOpt, menus: subData});
    }

    this.alertMenu.config({
      diameter: 200,
      percent: 0.3,
      background: 'rgba(0,0,0,0.8)',
      pageBackground: '#000',
      backgroundHover: 'rgb(0,0,0)',
      hideAfterClick: false,
      spaceDeg: 0.1,
      menus: menuData
    });
  }

  // Create confirmation message & button for sending Alert
  public async confirmAlert(Opt1: number, Opt2: number) {

    this.displayAlertMenu = false;
    this.alertMenu.hide();

    const alert = await this.alertController.create({
      header: 'Send Alert?',
      message: 'Alert will be broadcast to all nodes',
      buttons: [
        {
          text: 'No',
          handler: () => {
            this.addAlertEnabled = false;
          }
        }, {
          text: 'Yes',
          handler: async () => {
            const alertId = Guid.create().toString();
            this.addAlertEnabled = false;
            this.alertActive = true;

            const generateTask = async (settings: Array<any>) => {
              const tasks: Array<Task> = [];

              if (settings[Opt1].subMenu[Opt2].tasks !== undefined) {
                settings[Opt1].subMenu[Opt2].tasks.forEach(task => {
                  tasks.push({
                    alertId,
                    complete: false,
                    deviceId: [],
                    id: Guid.create().toString(),
                    taskInformation: task,
                    events: [{
                      type: TaskEventDataType.Information,
                      title: 'Created by ' + this.owntrack.deviceName,
                      description: '',
                      timestamp: new Date(),
                    }],
                    autoAssign: false
                  });
                });
              }
              return tasks;
            };

            const locations: any = await this.missionData.getMissionDataWithDefault('rescue-locations', 'rescue-locations.json');
            const settings = await this.alertMenuSettingsService.getSettings();

            let closest: any = null;
            if (!isNullOrUndefined(locations)) {
              if (locations.rescueLocations.length > 0) {
                closest = locations.rescueLocations.reduce((a, b) => {
                  const incident = new LatLonSpherical(this.alertMarkerPosition.lat, this.alertMarkerPosition.lon);
                  if (!isNullOrUndefined(a) && new LatLonSpherical(a.position.lat,  a.position.lon).distanceTo(incident) < new LatLonSpherical(b.position.lat,  b.position.lon).distanceTo(incident)) {
                    return a;
                  } else {
                    return b;
                  }
                }, closest);
              }
            }

            const tasks = await generateTask(settings);
            const contextualAlert: ContextualAlert = {
              id: alertId,
              ownerDeviceId: this.config.settings.deviceId,
              listOfTasks: tasks,
              message: settings[Opt1].mainOpt + ': ' + settings[Opt1].subMenu[Opt2].secOpt,
              active: true,
              timestamp: new Date(),
              primaryInfo: Opt1,
              secondaryInfo: Opt2,
              position: {lat: this.alertMarkerPosition.lat, lon: this.alertMarkerPosition.lon},
              incidentReport: {
                rescueLocation: closest
              }
            };

            this.store.dispatch(new AddContextualAlert(contextualAlert));
          }
        }
      ]
    });

    alert.present();
  }

  contractTrack(deviceId: string) {
    if (this.role.hasRole('controlTrack')) {
      this.router.navigate(['/track-control/', deviceId]);
    }
  }
}

