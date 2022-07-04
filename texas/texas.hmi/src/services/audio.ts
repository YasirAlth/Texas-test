import { Injectable } from '@angular/core';

/**
 * This service is used to preload and play back audio files.
 *
 * It abstracts the internal mechanism used to playback the audio.
 */
@Injectable()
export class AudioService {

  private audioFiles_: { [key: string]: HTMLAudioElement } = {};

  preload(key: string, asset: string) {

    this.audioFiles_[key] = new Audio(asset);
    console.log('Added audio file [' + key + ']: ' + asset);

  }

  play(key) {

    if (this.audioFiles_[key] != undefined) {

      // TODO unfortunately we have to re-load in chrome to re-play
      // ideally, we should be able to set this.audioFiles_[key].currentTime = 0
      this.audioFiles_[key].load();
      this.audioFiles_[key].play();

    } else {

      console.log('unable to play sound');

    }

  }

}
