/**
 * Created by mathe on 13/07/2017.
 */
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Device} from '@ionic-native/device/ngx';
import {BehaviorSubject, Observable, Subject, throwError} from 'rxjs';
import {Guid} from 'guid-typescript';
import {isNullOrUndefined} from '../functions/Utils';
import {Agency, Category, Settings, TrackControl} from '../interfaces';
import {LoadingController, Platform} from '@ionic/angular';
import {catchError, first, map} from 'rxjs/operators';
import PouchDB from 'pouchdb';
import {adjectives, animals, uniqueNamesGenerator, UniqueNamesGeneratorConfig} from 'unique-names-generator';
import * as _ from 'lodash';
import {MissionDataService} from './mission-data.service';

interface DefaultTrackConfigs {
  base: Settings;
  browser: { [key: string]: any };
  device: { [key: string]: any };
}

@Injectable()
export class ConfigService {

  public traccarIdToDeviceId: { [key: string]: string } = {};


  private _settings: Settings;

  private readonly settingsChangedSource: Subject<Settings> = new BehaviorSubject<Settings>(this._settings);
  public readonly settingsChanged$: Observable<Settings> = this.settingsChangedSource.asObservable();

  private _categories: Array<Category> = [];
  private _agencies: Array<Agency> = [];

  // True if we need to apply the category config to the settings (ie no saved data was found).
  private applyCategoryConfig = false;

  private readonly categoriesChangedSource: BehaviorSubject<Array<Category>> = new BehaviorSubject<Array<Category>>(this._categories);
  public readonly categoriesChanged$: Observable<Array<Category>> = this.categoriesChangedSource.asObservable();

  private readonly agenciesChangedSource: BehaviorSubject<Array<Agency>> = new BehaviorSubject<Array<Agency>>(this._agencies);
  public readonly agenciesChanged$: Observable<Array<Agency>> = this.agenciesChangedSource.asObservable();

  configLoaded: Promise<void>;
  private remoteDb: PouchDB.Database<{}>;
  private localDb: PouchDB.Database<{}>;
  private dbRevision: string = null;

  public get categories(): Array<Category> {
    return this._categories;
  }

  public set categories(categories: Array<Category>) {
    this._categories = categories;
    this.categoriesChangedSource.next(this._categories);
  }

  public get agencies(): Array<Agency> {
    return this._agencies;
  }

  public set agencies(agencies: Array<Agency>) {
    this._agencies = agencies;
    this.agenciesChangedSource.next(this._agencies);
  }

  public get settings(): Settings {
    return this._settings || {} as Settings;
  }

  public set settings(value: Settings) {
    // do not allow '-' in device ID
    value.deviceId = value.deviceId.replace(/-/g, '');

    this.applyConfig();

    const updateDB = async () => {
      try {
        const result = await this.localDb.put<Settings>(this._settings);
        this._settings._rev = result.rev;
      } catch (err) {
        console.log(err);
      }
    };

    updateDB().then(() => {
      this.settingsChangedSource.next(this._settings);
    });
  }

  constructor(
    private device: Device,
    private platform: Platform,
    private http: HttpClient,
    private missionDataService: MissionDataService,
    public loadingController: LoadingController
  ) {

    // Create the local database.
    this.localDb = new PouchDB('settings');

    this.configLoaded = new Promise<void>((resolve, reject) => {

     this.presentLoading().then(loading => {
       // load defaults and local changes in parallel,
       // then apply local changes
       Promise.all([
         this.setSettingsFromDefaults(), this.loadSettingsFromDb()
       ]).then(async ([, data]) => {

         let tracks = null;

         const configureMissionData = async (couchDatabaseServer: string) => {
           try {
             await this.missionDataService.configure(couchDatabaseServer);
             const result = await Promise.all([
               this.getCategories(this.missionDataService.getMissionData<Category>('categories')),
               this.getAgencies(this.missionDataService.getMissionData<Agency>('agencies')),
               this.missionDataService.getMissionData<any>('tracks')
             ]);

             tracks = result[2];

             // Assign the traccar config.
             tracks.tracks.forEach(track => {
               if ('deviceId' in track && 'traccarTrackerId' in track) {
                 this.traccarIdToDeviceId[track.traccarTrackerId] = track.deviceId;
               }
             });
           } catch (e) {
             console.error(`Error fetching mission data: ${e}`);
           }
         };

         if (!isNullOrUndefined(data)) {
           await configureMissionData(data.couchDatabaseServer);
           this.settings = Object.assign(this._settings, data);
         } else {

           await configureMissionData(this._settings.couchDatabaseServer);

           if (this.isOnDevice()) {
             if (!isNullOrUndefined(tracks)) {
               // add in the settings based on the specific device
               const trackSettings = tracks.tracks.find(track => track.deviceId === this._settings.deviceId);
               if (trackSettings) {

                 Object.assign(this._settings, trackSettings);
               }
             } else  {
               console.error(`Error fetching track configuration, using defaults`);
             }
           }

           this._settings._rev = this.dbRevision;
           this.settings = this._settings;
         }

         // Create the remote database.
         this.remoteDb = new PouchDB(this.settings.couchDatabaseServer + `/settings-${this.settings.deviceId.toLowerCase()}`);
         this.localDb.sync(this.remoteDb, {
           live: true,
           retry: true
         });

         resolve();
         loading.dismiss();
       }).catch(error => {
         reject(error);
         loading.dismiss();
         console.error('Error loading settings: ' + (error.message || error));
       });

       this.settingsChanged$.subscribe((settings: Settings) => {
         console.log('settings changed to:');
         console.log(settings);
       });
     });
   });
  }

  private applyConfig() {
// if applyCategoryConfig is true then we need to apply the category config to this track.
    const owntrackCat = this.categories.filter(c => c.categoryId === this._settings.categoryId);
    if (owntrackCat.length > 0) {
      const ignore = ['categoryId', 'categoryName', 'abbreviation'];
      const filtered = Object.keys(owntrackCat[0])
        .filter(key => !ignore.includes(key));
      filtered.forEach(key => {
        this._settings[key] = owntrackCat[0][key];
      });
    }
  }

  private async loadSettingsFromDb() {
    try {
      return await this.localDb.get<Settings>('settings');
    } catch (err) {
      console.log(err);
      const result = await this.localDb.put({
        _id: 'settings'
      });
      this.dbRevision = result.rev;
      return null;
    }
  }

  public async setSettingsFromDefaults() {
    // load json file and apply ENV configuration over the top
    const data = await this.getDefaultTrackConfig().pipe(first()).toPromise();
    const id = this.device.serial === 'unknown' || isNullOrUndefined(this.device.serial) ? this.device.uuid : this.device.serial;
    this._settings = await this.getSettingsForDevice(data, id, this.isOnDevice());
  }

  public async getSettingsForDevice(data: DefaultTrackConfigs, deviceId: string, isOnDevice: boolean): Promise<Settings> {

    const config: UniqueNamesGeneratorConfig = {
      separator: ' ',
      length: 2,
      dictionaries: [adjectives, animals]
    };

    // new settings are based on the bland 'default' settings
    const result = data.base;
    // add in settings based on the the system
    if (isOnDevice) {
      // override the fields set in 'device'
      Object.assign(result, data.device);

      result.deviceId = deviceId;
      result.deviceName = (_.split(uniqueNamesGenerator(config), ' ').reduce((a, b) => a + ' ' + _.capitalize(b), '')).trim();

    } else {
      // override the fields set in 'browser's
      Object.assign(result, data.browser);

      // Browsers are special and use a guid.
      result.deviceId = deviceId || Guid.create().toString().replace(/-/g, ''); // use input deviceId if set

      result.deviceName = result.deviceName ||  (_.split(uniqueNamesGenerator(config), ' ').reduce((a, b) => a + ' ' +  _.capitalize(b), '')).trim();
    }

    return result;
  }

  public isOnDevice(): boolean {
    return this.platform.is('cordova');
  }

  public updateRemoteSettings(control: TrackControl) {
    this.settings.selfTrackUpdateRate = typeof control.categoryId === 'number' ? control.updateRate : Number(control.categoryId);
    this.settings.deviceName = control.deviceName;
    this.settings.categoryId = typeof control.categoryId === 'number' ? control.categoryId : Number(control.categoryId);
    this.settings.agencyId = typeof control.agencyId === 'number' ? control.agencyId : Number (control.agencyId);
    this.settings.primarySource = Number(control.primarySource);

    if (control.whiteList !== null) {
      this.settings.trackPrefixWhitelist = control.whiteList;
    }
    // this.storage.set('settings', this._settings);
    this.settingsChangedSource.next(this._settings);
  }

  public getDefaultTrackConfig(): Observable<any> {
    return this.http.get('./assets/mission-data-defaults/track-config.json').pipe(
      map((res: any) => res),
      catchError(error => throwError(error)));
  }

  private async getCategories(categoriesPromise: Promise<any>) {
    const buildCategories = (categories) => {
      categories.forEach(category => {
        const cat: Category = {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          abbreviation: category.abbreviation,
          roles: category.roles
        };
        this._categories.push(cat);
      });
      this.categories = this._categories;
    };

    // ------ Get Categories ------
    try {
      const result = await categoriesPromise;
      buildCategories(result.categories);
    } catch (error) {
      console.log(`Could not get categories data from remove source ${error}`);
      const result = await this.getDefaultCategoryConfig().toPromise();
      buildCategories(result.categories);
    }
  }

  private async getAgencies(agenciesPromise: Promise<any>) {
    const buildAgencies = (agencies) => {
      agencies.forEach(agency => {
        const a: Agency = {
          agencyId: agency.agencyId,
          agencyName: agency.agencyName,
          agencyAbbr: agency.agencyAbbr,
          categories: agency.categories
        };
        this._agencies.push(a);
      });
      this.agencies = this._agencies;
    };

    // ------ Get Agencies ------
    try {
      const result = await agenciesPromise;
      buildAgencies(result.agencies);
    } catch (error) {
      console.log(`Could not get agencies data from remove source ${error}`);
      const result = await this.getDefaultAgencyConfig().toPromise();
      buildAgencies(result.agencies);
    }
  }

  public getDefaultCategoryConfig(): Observable<any> {
    return this.http.get('./assets/mission-data-defaults/category-config.json').pipe(
      map((res: any) => res),
      catchError(error => throwError(error)));
  }

  public getDefaultAgencyConfig(): Observable<any> {
    return this.http.get('./assets/mission-data-defaults/agency-config.json').pipe(
      map((res: any) => res),
      catchError(error => throwError(error)));
  }

  async presentLoading() {
    const loading = await this.loadingController.create({
      message: 'Please wait...',
      duration: 0
    });
    await loading.present();

    return loading;
  }
}
