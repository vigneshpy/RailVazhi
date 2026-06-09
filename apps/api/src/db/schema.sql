-- Enable PostGIS for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Stations: each stop on a railway line
CREATE TABLE IF NOT EXISTS railway_stations (
  code          TEXT PRIMARY KEY,             -- e.g. "SVKS", "MDU"
  name          TEXT NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  geom          GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED
);

CREATE INDEX IF NOT EXISTS idx_railway_stations_geom ON railway_stations USING GIST (geom);

-- Railway lines: the track geometry connecting stations
CREATE TABLE IF NOT EXISTS railway_lines (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  geom          GEOMETRY(LINESTRING, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_railway_lines_geom ON railway_lines USING GIST (geom);

-- Level crossing gates
-- upstream/downstream relative to train direction (lower km -> higher km)
CREATE TABLE IF NOT EXISTS railway_gates (
  id                          TEXT PRIMARY KEY,   -- e.g. "G001"
  name                        TEXT NOT NULL,
  lat                         DOUBLE PRECISION NOT NULL,
  lng                         DOUBLE PRECISION NOT NULL,
  geom                        GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
  upstream_station_code       TEXT NOT NULL REFERENCES railway_stations(code),
  downstream_station_code     TEXT NOT NULL REFERENCES railway_stations(code),
  -- how many minutes before train arrival the gate closes
  closure_buffer_min          INTEGER NOT NULL DEFAULT 15,
  -- how many minutes after train passes before gate opens
  opening_buffer_min          INTEGER NOT NULL DEFAULT 5,
  distance_from_upstream_km   DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_railway_gates_geom ON railway_gates USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_railway_gates_upstream ON railway_gates (upstream_station_code);
CREATE INDEX IF NOT EXISTS idx_railway_gates_downstream ON railway_gates (downstream_station_code);

-- Scheduled timetable: one row per train per station stop
CREATE TABLE IF NOT EXISTS train_schedules (
  id                  SERIAL PRIMARY KEY,
  train_no            TEXT NOT NULL,
  station_code        TEXT NOT NULL REFERENCES railway_stations(code),
  arrival_scheduled   TIME,               -- NULL for origin
  departure_scheduled TIME,               -- NULL for terminus
  day_of_run          SMALLINT NOT NULL DEFAULT 0  -- 0=daily, 1=Mon ... 7=Sun
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_train_schedules_train_station
  ON train_schedules (train_no, station_code);

CREATE INDEX IF NOT EXISTS idx_train_schedules_station
  ON train_schedules (station_code);

-- Live NTES events: cached scrape results
CREATE TABLE IF NOT EXISTS train_events (
  id              BIGSERIAL PRIMARY KEY,
  train_no        TEXT NOT NULL,
  station_code    TEXT NOT NULL REFERENCES railway_stations(code),
  event_type      TEXT NOT NULL CHECK (event_type IN ('ARR', 'DEP')),
  scheduled_time  TIMESTAMPTZ NOT NULL,
  actual_time     TIMESTAMPTZ,
  delay_min       INTEGER,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_train_events_train_station
  ON train_events (train_no, station_code);

CREATE INDEX IF NOT EXISTS idx_train_events_fetched_at
  ON train_events (fetched_at DESC);
