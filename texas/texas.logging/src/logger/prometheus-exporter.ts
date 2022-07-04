import * as express from 'express';
import { isNullOrUndefined } from 'util';
import { Observable } from 'rxjs';

// subset of ITrack interface from texas.hmi
export interface ITrackMetrics {
  deviceId: string;
  deviceName: string;
  timestamp: Date;
  posAccuracy?: number;
  battery: number;
}

export class PrometheusExporter {

  private app: express.Application = express();
  private server;

  private metrics = new Map<string, string>();

  constructor(private tracks$: Observable<any>) {
    this.app.get('/', (req, res) => {
      res.setHeader('Content-Type', 'text/plain')
      res.send('TEXAS Logger service. Prometheus metrics hosted at /metrics.');
    });

    this.tracks$.subscribe(this.updateMetrics.bind(this));

    this.app.get('/metrics', (req, res) => {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4')
      res.send(this.generateExposition());
    });

    const port = 80;
    this.server = this.app.listen(port, () => {
      console.log(`Prometheus metrics listening on :${port}/metrics`);
    });
  }

  close() {
    this.server.close();
  }

  private updateMetrics(track: ITrackMetrics) {
    const timestamp_ms = new Date(track.timestamp).valueOf();
    if (!isNullOrUndefined(track.battery)) {
      let key = `texas_device_battery_percent{device_id="${track.deviceId}",device_name="${track.deviceName}"}`;
      let value = `${track.battery} ${timestamp_ms}`;
      this.metrics.set(key, value);
    }
    if (!isNullOrUndefined(track.posAccuracy)) {
      let key = `texas_device_position_accuracy_metres{device_id="${track.deviceId}",device_name="${track.deviceName}"}`;
      let value = `${track.posAccuracy} ${timestamp_ms}`;
      this.metrics.set(key, value);
    }
  }

  private generateExposition(): string {
    let result = `\
# TYPE texas_device_battery_percent gauge
# HELP texas_device_battery_percent The remaining battery as a percentage (0-100)
# TYPE texas_device_position_accuracy_metres gauge
# HELP texas_device_position_accuracy_metres The device's GPS position accuracy
`;
    for (const [k, v] of this.metrics) {
      result += `${k} ${v}\n`;
    }
    return result;
  }
}
