import { LatLon } from '../interfaces/lat-lon';
import { Track } from '../interfaces/track';

export function copyTrack(t: Track): Track {
  return {
    source: t.source,
    primarySource: t.primarySource,
    deviceId: t.deviceId,
    deviceName: t.deviceName,
    categoryId: t.categoryId,
    agencyId : t.agencyId,
    position: { lat: t.position.lat, lon: t.position.lon } as LatLon,
    posAccuracy: t.posAccuracy,
    course: t.course,
    heading: t.heading,
    active: t.active,
    timestamp: t.timestamp,
    type: t.type,
    updateRate: t.updateRate,
    whiteList: t.whiteList,
    battery: t.battery
  } as Track;
}
