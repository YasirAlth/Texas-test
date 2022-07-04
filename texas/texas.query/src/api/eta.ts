import * as express from 'express';
import { Dms, LatLonSpherical } from 'geodesy';

export class Eta {
  // speeds of vehicles (m/s)
  static VEHICLES: { [key: string]: any } = {
    JRB: {
      speed: 19.5, // SLSSA 38 knots
    },
    ORB: {
      speed: 20.0, // not verified
    },
    RIB: {
      speed: 12.0, // not verified
    },
    IRB: {
      speed: 15.4, // SLSSA 30 knots - flat seas, 25 knots - choppy seas
    },
    RWC: {
      speed: 23.15, // SLSSA 45 knots
    },
  };

  static DEFAULT_SPEED = 1;

  public constructor(router: express.Router) {
    router
      .route('/eta')
      .get(Eta.getEta)
      .post(Eta.getEta);
  }

  public static getEta(req: express.Request, res: express.Response): void {
    if (req.body.distance) {
      res.send(Eta.getEtaByDistance(req.body));
    } else {
      res.send(Eta.getEtaByLatLon(req.body));
    }
  }

  /*
  
  Parameters

  - distance (distance in metres)
  - speed (current speed in metres/second)
  - type (vehicle)
    JRB - Jet boat
    ORB - Offshore boat
    RIB - Rigid inflateable
    IRB - Inflateable
    RWC - Water craft

  results
  - eta (seconds)
  - speed (optional) (m/s)

   */
  private static getEtaByDistance(body: any): any {
    let response: any = {};

    const distance: number = body.distance;

    const speed = Eta.calculateSpeed(body, response);

    response.eta = distance / speed;

    return response;
  }

  /*
  Parameters:
  - source (lat, lon) (current location)
  - destination (lat, lon)
  - speed (current speed in metres/second)
  - type (vehicle)
    JRB - Jet boat
    ORB - Offshore boat
    RIB - Rigid inflateable
    IRB - Inflateable
    RWC - Water craft

  Results:
  - distance (metres)
  - bearing  (degrees)
  - eta (seconds)
  - speed (optional) (m/s)

  */
  private static getEtaByLatLon(body: any): any {
    let response: any = {};

    if (!body.source || !body.destination) {
      response.error = 'Must assign source & destination.';
      return response;
    }

    const source = new LatLonSpherical(body.source.lat, body.source.lon);
    const target = new LatLonSpherical(
      body.destination.lat,
      body.destination.lon
    );

    const distance = (response.distance = source.distanceTo(target));
    const bearing = (response.bearing = source.bearingTo(target));

    const speed = Eta.calculateSpeed(body, response);

    response.eta = distance / speed;

    return response;
  }

  private static calculateSpeed(body: any, response: any): number {
    if (body.speed) {
      return body.speed;
    }

    if (body.type) {
      let vehicle = Eta.VEHICLES[body.type];
      if (!vehicle) {
        response.error = 'Invalid vehicle type; using default.';
      }
      return (response.speed = vehicle ? vehicle.speed : Eta.DEFAULT_SPEED);
    }

    response.error = 'Must provide either type or speed; using default.';
    return (response.speed = Eta.DEFAULT_SPEED);
  }
}
