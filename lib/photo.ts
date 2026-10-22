// Right-size vehicle photos. SM360 serves full-size originals (~260 KB) but
// also resized copies at /ir/w{W}h{H}c/ — cards and thumbnails don't need the
// original, and it was the bulk of every page's weight. Only these sizes exist
// (w1024+ 404s). Other hosts are returned unchanged. `px` is roughly how wide
// the image is shown, matching the size hints used with vehicleImageURL.
const SM360 = /^https:\/\/img\.sm360\.ca\/images\/(inventory\/.+)$/;

export function sizedPhoto(url: string | undefined | null, px: number): string | undefined {
  if (!url) return undefined;
  const m = url.match(SM360);
  if (!m) return url;
  const dim = px <= 300 ? 'w400h300c' : px <= 500 ? 'w640h480c' : 'w800h600c';
  return `https://img.sm360.ca/ir/${dim}/images/${m[1]}`;
}
