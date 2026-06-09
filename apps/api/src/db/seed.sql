-- Seed data for Sivakasi-Madurai corridor
-- Run with: pnpm --filter api db:seed

-- Stations
-- Coordinates sourced from OpenRailwayMap / NTES station data
INSERT INTO railway_stations (code, name, lat, lng) VALUES
  ('SVKS', 'Sivakasi',          9.4533,  77.7989),
  ('TTL', 'Thiruthaangal',     9.4712,  77.8301),  -- TODO: verify coords from OpenRailwayMap
  ('VPT',  'Virudhunagar Jn',   9.5810,  77.9580),
  ('SRT',  'Sattur',            9.3565,  77.9178),
  ('KSBT', 'Kovilpatti',        9.1735,  77.8694),
  ('MDU',  'Madurai Jn',        9.9195,  78.1194)
ON CONFLICT (code) DO NOTHING;

-- Railway line: Sivakasi branch -> Virudhunagar -> Madurai
-- TODO: replace with accurate LINESTRING from OpenRailwayMap export
INSERT INTO railway_lines (name, geom) VALUES (
  'Sivakasi-Madurai Line',
  ST_GeomFromText(
    'LINESTRING(77.7989 9.4533, 77.9580 9.5810, 77.9178 9.3565, 77.8694 9.1735, 78.1194 9.9195)',
    4326
  )
) ON CONFLICT DO NOTHING;

-- Level crossing gates on the Sivakasi-Madurai corridor
-- TODO: replace lat/lng with exact GPS from OpenRailwayMap or field survey
INSERT INTO railway_gates (id, name, lat, lng, upstream_station_code, downstream_station_code, closure_buffer_min, opening_buffer_min, distance_from_upstream_km) VALUES
  (
    'G001',
    'Sivakasi North Gate',
    9.4711608, 77.8013653,  -- OSM node 8155117772
    'SVKS', 'TTL',
    15, 5,
    2.0
  ),
  (
    'G004',
    'Thiruthaangal Gate',
    9.4971656, 77.8414815,  -- OSM node 12833353995
    'TTL', 'VPT',
    15, 5,
    2.9
  ),
  (
    'G002',
    'Virudhunagar South Gate',
    9.4927927, 77.9433338,  -- OSM node 4712389087
    'VPT', 'SRT',
    15, 5,
    9.8
  ),
  (
    'G003',
    'Sattur East Gate',
    9.3480, 77.9310,        -- TODO: verify, outside OSM query bbox
    'SRT', 'KSBT',
    15, 5,
    1.5
  )
ON CONFLICT (id) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  distance_from_upstream_km = EXCLUDED.distance_from_upstream_km;

-- Trains on the Sivakasi-Madurai corridor
-- 16101: Chennai Egmore - Nagercoil (passes through Madurai, Virudhunagar)
-- 16128: Guruvayur - Tuticorin (passes through Madurai, Virudhunagar, Sivakasi)
-- Schedule times are approximate; verify against NTES timetable

INSERT INTO train_schedules (train_no, station_code, arrival_scheduled, departure_scheduled, day_of_run) VALUES
  -- 16128 Guruvayur - Tuticorin Express (downward: towards Sivakasi)
  ('16128', 'MDU',  '06:30', '06:40', 0),
  ('16128', 'VPT',  '07:45', '07:47', 0),
  ('16128', 'TTL', '08:05', '08:06', 0),  -- TODO: verify against NTES timetable
  ('16128', 'SVKS', '08:15', NULL,    0),

  -- 16127 Tuticorin - Guruvayur Express (upward: away from Sivakasi)
  ('16127', 'SVKS', NULL,    '18:10', 0),
  ('16127', 'TTL', '18:20', '18:21', 0),  -- TODO: verify against NTES timetable
  ('16127', 'VPT',  '18:35', '18:37', 0),
  ('16127', 'MDU',  '19:50', '20:00', 0),

  -- 16101 Madurai - Rameswaram Passenger (local)
  ('16101', 'MDU',  NULL,    '07:00', 0),
  ('16101', 'VPT',  '08:10', '08:12', 0),
  ('16101', 'SRT',  '08:45', '08:46', 0)
ON CONFLICT (train_no, station_code) DO NOTHING;
