// Represents the category of a track (i.e. the vehicle/role)
export interface Category {
  categoryId: number;   // Example number from 0 -> n
  categoryName: string; // Example SLS Rescue Vessel Name
  abbreviation: string; // short name
  roles: string[];     // roles that this category can perform.
}
