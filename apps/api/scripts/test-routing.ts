import "dotenv/config";
import { getRoute } from "../src/services/routing.js";
import { logger } from "../src/logger.js";

const [srcLat, srcLng, dstLat, dstLng] = process.argv.slice(2).map(Number);

const source = {
  lat: isNaN(srcLat) ? 9.4533 : srcLat,
  lng: isNaN(srcLng) ? 77.7989 : srcLng,
};
const destination = {
  lat: isNaN(dstLat) ? 9.5810 : dstLat,
  lng: isNaN(dstLng) ? 77.9580 : dstLng,
};

try {
  const route = await getRoute(source, destination);
  console.log(JSON.stringify({
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    coordinateCount: route.polyline.coordinates.length,
    firstPoint: route.polyline.coordinates[0],
    lastPoint: route.polyline.coordinates.at(-1),
  }, null, 2));
} catch (err) {
  logger.error({ err }, "routing failed");
  process.exit(1);
}
