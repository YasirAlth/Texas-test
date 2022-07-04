import {Source} from '../enums/source';

export interface Settings {

  _id: string;
  _rev?: string;

  // ------ Device Information ------
  deviceId: string;
  deviceName: string;

  // ------ Browser Settings ------
  firstRun: boolean;

  // ------ Track Settings ------
  trackPrefixWhitelist: string;
  trackHistoryExpiry: number; // ms
  selfTrackUpdateRate: number;
  categoryId: number;
  agencyId: number;
  primarySource: Source;
  traccarTrackerId: string;
  observer: boolean;

  // ------ Update rate thresholds -----
  minimumTrackUpdateRate: number;
  maximumTrackUpdateRate: number;

  // ------ Sensor Settings ------
  gpsEnabled: boolean;
  traccarEnabled: boolean;
  compassEnabled: boolean;

  // ------ Alert Settings ------
  alertSoundOn: boolean;

  // ------ Battery Saving (auto) Settings -----
  powerSaveBatteryThreshold: number; // (%)
  movementThreshold: number; // (metres)

  // ------ LASAGNE Settings ------
  lasagneWebsocketUrl: string;

  // ------ Optional Developer Mode (R: random movement, M: manual position) ------
  developerMode: string;

  // ------ Remote Server URLs ------
  rocketChatServer: string;
  traccarApiBase: string;
  texasReplayServer: string;
  couchDatabaseServer: string;
  texasQueryServer: string;

  maptrackUp: boolean;
  maplockOwntrack: boolean;

  roles: string[];
}

