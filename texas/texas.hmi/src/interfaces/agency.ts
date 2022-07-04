// Represents the agency a track belongs to
export interface Agency {
    agencyId: number;   // Example number from 0 -> n
    agencyName: string; // Example SLS Rescue Vessel Name
    agencyAbbr: string; // short name
    categories: [number];
  }
