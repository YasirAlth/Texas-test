import { Injectable } from '@angular/core';

import * as _ from 'lodash';
import {ConfigService} from './config';
import {Track} from '../interfaces';
import {Source} from '../enums/source';


@Injectable()
export class FusionProvider {

  // Stores each source for each track.
  private readonly tracks: { [key: string]: { [key: number]: Track } } = {};

  // How long to wait until a source of information is stale.
  private readonly lasagneTimeoutLimit = 10000;

  // Timeout for when a source is to be purged.s
  private readonly purgeTimeout = 20000;

  /**
   * Constructor.
   *
   * @param config - handle to the config service.
   */
  constructor(private config: ConfigService) {
  }

  /**
   * Fuses the given track.
   * @param {Track} track - the incoming track with a single associated source.
   * @returns {Track} - the outgoing track with an aggregation of track and source information.s
   */
  public fuseTrack(track: Track): Track {

    // Lets not worry about Local (probably Owntrack) for now.
    if (track.source.includes(Source.Local)) {
      return track;
    }

    // Correlate the traccar tracker ID to its TEXAS track.
    if (track.source.includes(Source.Traccar)) {
      if (this.config.traccarIdToDeviceId[track.deviceId] !== undefined) {
        track.deviceId = this.config.traccarIdToDeviceId[track.deviceId];
      }
    }

    // Get the current sources of data for the track.
    const sourceTrackData = this.getTrackSources(track);

    // Save the source track data for the given source.
    sourceTrackData[track.source[0]] = track;

    // Update sources and remove any old sources.
    const source = this.updateSources(sourceTrackData, track);

    // Fuse and return the result.
    track = this.fuse(sourceTrackData, track);

    // Copy and return
    const copy = _.cloneDeep(track);
    copy.source = source;

    return copy;
  }

  /**
   * Gets all track source information for the given track. DeviceID is the correlating key.
   * @param {Track} track - the incoming track
   * @returns {{[p: number]: Track}} - the list of all sources for this track.
   */
  private getTrackSources(track: Track) {
    // Look it up.
    let sourceTrackData = this.tracks[track.deviceId];
    if (sourceTrackData === undefined) {
      // Create it and assign.
      sourceTrackData = {};
      this.tracks[track.deviceId] = sourceTrackData;
    }

    return sourceTrackData;
  }

  /**
   * Fused the incoming track data with the rest of the stored track data for this track.
   * @param sourceTrackData - the existing track data across all sources.
   * @param {Track} track - the incoming track data.
   * @returns {Track} - the fused track data to be propagated through the rest of the system.
   */
  private fuse(sourceTrackData, track: Track) {

    // Our two possible sources right now are Lasagne and Traccar.
    const lasagneTrack = sourceTrackData[Source.Lasagne];
    const traccarTrack = sourceTrackData[Source.Traccar];

    // Check to see if there is only one available source.
    if (Object.keys(sourceTrackData).length === 1) {
      if (lasagneTrack !== undefined) {
        track = lasagneTrack;
      } else if (traccarTrack !== undefined) {
        track = traccarTrack;
      }
    } else {
      // TODO FIXME
      if (lasagneTrack != null) {
        // Some extra info from the LASAGNE track the Traccar track doesn't have.
        if (lasagneTrack.hasOwnProperty('categoryId')) {
          track.categoryId = lasagneTrack.categoryId;
        }
        if (lasagneTrack.hasOwnProperty('whitelist')) {
          track.whiteList = lasagneTrack.whiteList;
        }

        if (lasagneTrack.primarySource === Source.Lasagne && traccarTrack.timestamp.valueOf() - lasagneTrack.timestamp.valueOf() < this.lasagneTimeoutLimit) {
          track = lasagneTrack;
        } else {
          track = traccarTrack;
        }
      } else {
        track = traccarTrack;
      }
    }
    return track;
  }

  /**
   * Updates the sources and returns the list of active sources.
   * @param sourceTrackData - the source data.
   * @param {Track} track - the incoming track data.
   * @returns {Source[]} - the list of active sources for this track.
   */
  private updateSources(sourceTrackData, track: Track): Source[] {
    const activeSources: Source[] = [];
    for (const key in sourceTrackData) {
      const timeout = this.purgeTimeout;
      if (sourceTrackData[key].timestamp.valueOf() + timeout < Date.now().valueOf()) {
        delete sourceTrackData[key];
      } else {
        activeSources.push(sourceTrackData[key].source[0]);
      }
    }
    // The list of active sources.
    return activeSources;
  }
}
