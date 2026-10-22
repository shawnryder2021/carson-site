import { Vehicle } from './inventory';

// Image shown wherever a vehicle has no photos yet: an admin-approved AI
// illustration if there is one (callers label it), otherwise the static
// "Photos coming soon" placeholder — the Carson Exports logo on a studio
// backdrop (public/photos-coming-soon.svg, downloaded once and cached).
//
// `size` is kept for call-site compatibility; the placeholder is a single
// 4:3 image whose content sits in the centre, so square crops lose nothing.
export const PHOTOS_COMING_SOON = '/photos-coming-soon.svg';

export function vehicleImageURL(vehicle: Vehicle & { aiImage?: string | null }, _opts?: { size?: number }): string {
  return vehicle.aiImage || PHOTOS_COMING_SOON;
}
