// Marker class to manage the detail display box
// This manages the icon for it, rather than include it all in track marker.
// This could also be used by the alert pin too.

import {LatLon} from '../../interfaces';

export class TrackDetail {

  public trackTitle  = '';
  public trackDetails = '';
  public position: LatLon;
  public id: string;

  public data: { [key: string]: string };

  constructor(latLon: LatLon, alertId: string, info: { [key: string]: string }) {
    this.data = info;
    this.position = latLon;
    this.id = alertId;
    this.createIcon();
  }

  updateInfo(info: { [key: string]: string }) {
    for (const k of Object.keys(info)) {
      this.data[k] = info[k];
    }
    this.createIcon();
  }

  replaceInfo(info: { [key: string]: string }) {
    this.data = info;
    this.createIcon();
  }

  createIcon(): void {
    let title = 'Marker';
    let details = '';
    for (const field of Object.keys(this.data)) {
      if (field === 'title') {
        title = this.data[field];
      } else {
        details += field + ': ' + this.data[field] + '\n';
      }
    }

    this.trackTitle = title + '\n';
    this.trackDetails = details;
  }
}
