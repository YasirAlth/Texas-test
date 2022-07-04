import { TrackDetail } from './track-detail';
import {ContextualAlert, Track} from '../../interfaces';
import { Source } from '../../enums/source';
import { ManualTrackService } from '../../services/manual-tracks';
import {LatLon} from '../../interfaces';

export class TrackMarker {

  // detail is stored via track marker so that track updates etc will manage it too via this class
  private _detail: TrackDetail;
  private _position: LatLon = {lat: 0, lon: 0};
  private _trackIconSvg = '';
  private _id = '';
  private _courseSvg: string = null;
  private _course: number = null;

  private heading = 0;
  private colour: string;
  private alertActive: boolean;
  private type: string;

  get trackIconSvg(): string {
    return this._trackIconSvg;
  }

  get detail(): TrackDetail {
    return this._detail;
  }

  get position(): LatLon {
    return this._position;
  }

  get id(): string {
    return this._id;
  }

  get courseSvg(): string {
    return this._courseSvg;
  }

  get course(): number {
    return this._course;
  }

  constructor(
    private manualTracksService: ManualTrackService,
    private self: boolean,
    public isAlert: boolean = false) {
  }

  public setInfo(info: { [key: string]: string }, update?: boolean) {
    if (this._detail) {
      if (update) {
        this._detail.updateInfo(info);
      } else {
        this._detail.replaceInfo(info);
      }
    } else {
      this._detail = new TrackDetail(this.position, this.id, info);
    }
  }

  private determineColour(source: Source[], trackInactive: boolean = false): string {
    if (trackInactive) {
      return 'grey';
    }
    if (this.alertActive) {
      return 'red';
    }
    if (source.includes(Source.Local)) {
      return 'green';
    } else if (source.includes(Source.Lasagne)) {
      return 'purple';
    } else if (source.includes(Source.Traccar)) {
      return 'blue';
    }
  }

  public updateTrack(track: Track) {

    this.type = track.type;
    this._id = track.deviceId;

    if (this._position !== track.position) {
      this._position = track.position;

      if (this._detail) {
        this._detail.position = this._position;
      }
    }

    let updatedRequired = false;

    if ((this.heading === 0 && track.heading !== 0) || (this.heading !== 0 && track.heading === 0)) {
       updatedRequired = true;
     }

    if ((this._course === 0 && track.course !== 0) || (this._course !== 0 && track.course === 0) ||
        (this._course === null && track.course !== null) ||  (this._course === undefined && track.course !== undefined)) {
      updatedRequired = true;
    }

    this.heading = track.heading;
    this._course = track.course;

    const newColour = this.determineColour(track.source, !track.active);
    if (this.colour !== newColour) {
      this.colour = newColour;
      updatedRequired = true;
    }

    if (updatedRequired) {
      this.createIcon();
    }
  }

  public updateAlert(alert: ContextualAlert) {
    this._id = alert.id;

    if (this.alertActive !== alert.active) {
      this.alertActive = alert.active;
    }
  }

  private createIcon() {
    const radius = this.self ? 10 : 14;

    const svgHtmlBody = `width="${radius * 2}" height="${radius * 2}" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="${this.colour}" fill-opacity="1.0"`;
    let shapeHtml = '';

    if (this._course !== undefined && this._course !== null) {
      const courseSize = (radius * 8);
      const svgCourseBody2 = `width="${courseSize}" height="${courseSize}" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="${this.colour}" fill-opacity="1.0"`;
      this._courseSvg =  `data:image/svg+xml;utf8,<svg ${svgCourseBody2}> <line x1="${courseSize / 2}" y1="${courseSize / 2}" x2="${courseSize / 2}" y2="${courseSize / 2} + 50" style="stroke:${this.colour};stroke-width:3" /></svg>`;
    }

    if (this.heading) {
      // when in movement, rotate svg and use directional shape
      shapeHtml = `<path d="M ${radius} 0 L 0 ${radius} a ${radius} ${radius} 0 0 0 ${radius * 2} 0 Z"/>`;
    } else {
      switch (this.type) {
        // diamond (triangulation mode)
        case 'TRI':
          shapeHtml = `<polygon points="${radius} 0, ${radius * 0.25} ${radius}, ${radius} ${radius * 2}, ${radius * 1.75} ${radius}"/>`;
          break;
        // basic circle
        case 'MAN':
        default:
          shapeHtml = `<circle cx="${radius}" cy="${radius}" r="${radius}"/>`;
          break;
      }
    }

    this._trackIconSvg = `data:image/svg+xml;utf8,<svg ${svgHtmlBody}>${shapeHtml}</svg>`;
  }
}
