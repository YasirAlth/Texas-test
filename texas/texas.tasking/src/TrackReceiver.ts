import { Logger } from 'log4js';
import { Track } from './interfaces/track';
import { Amqp } from './services/amqp';

const rabbitAdminUsername =  process.env['rabbitmq-username'];
const rabbitAdminPassword = process.env['rabbitmq-password'];
const releaseName = process.env.RELEASE_NAME;
const namespace =  process.env.NAMESPACE;

// The amqp address
const amqpAddress: string = "amqp://" + rabbitAdminUsername + ":" + rabbitAdminPassword + "@" + releaseName + "-rabbitmq-ha." + namespace + ".svc.cluster.local";

// The track exchange details.
const amqpTracksExchange: string = 'texas.tracks';

/**
 * A class that connects to the TEXAS AMQP broker and subscribes to the tracks exchange.
 */
export class TrackReceiver {
  // A map of tracks bu their ID.
  private tracks = new Map<string, Track>();

  /**
   * Constructor.
   * @param logger - logger reference.
   */
  constructor(private logger: Logger) {
    const amqp: Amqp = new Amqp();

    // Do the AMQP connection...
    amqp
      .connectAmqp(amqpAddress)
      .then(() => {
        // Looking good.
        this.logger.debug('Connected successfully');

        // Connect the tracks exchange
        amqp.connectExchange(amqpTracksExchange).subscribe((track: Track) => {
          // Got a track, lets filter out manual tracks and triangulation tracks.
          if (track.type !== 'MAN' && track.type !== 'TRI') {
            // Add to the track map.s
            this.tracks.set(track.deviceId, track);
          }
        });
      })
      .catch(error => {
        this.logger.debug('could not connect on ' + amqpAddress + error);
        process.exit(1);
      });
  }

  /**
   * Returns the list of tracks.
   */
  public getTracks(): Map<string, Track> {
    return this.tracks;
  }

  /**
   * Adds a track to the list of tracks.
   */
  public addTrack(deviceId: string, track: Track) {
    this.tracks.set(deviceId, track);
  }

  /**
   * Re4move tracks that haven't updated for a while.
   */
  public purgeTracks() {
    const oneMin = 60000; // in ms
    const expired = Array.from(this.tracks.values()).filter(
      track =>
        new Date(track.timestamp).valueOf() + oneMin < new Date().valueOf()
    );
    expired.forEach(track => {
      this.logger.debug('purging track ' + track.deviceId);
      this.tracks.delete(track.deviceId);
    });
  }
}
