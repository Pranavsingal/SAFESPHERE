-- SafeSphere - Performance Indexes (Phase 4)
-- ================================================
-- Added by Member 2 during Phase 4 performance tuning.
--
-- WHY THESE THREE: Sequelize auto-creates indexes on the primary
-- key (id) and the workerId foreign key when the Alerts table is
-- first created, but nothing else. These three columns are the
-- ones actually filtered/scanned on frequently:
--   - severity:  filtered directly by GET /api/alerts?severity=...
--   - resolved:  filtered directly by GET /api/alerts?resolved=...
--   - timestamp: scanned by GET /api/reports/weekly's 7-day window
--
-- WHY NOT MORE: columns like `type` (only 4-5 distinct values) and
-- `description` (free text, never filtered on) were deliberately
-- left unindexed — too few distinct values or never queried, so an
-- index there would only add write overhead with no real benefit.
--
-- HOW TO APPLY: run this against the database (e.g. via
-- `docker exec -it safesphere-mysql mysql -u root -p` then paste
-- these statements, or include in a migration if the team adds a
-- formal Sequelize migration setup later).

USE safesphere;

CREATE INDEX idx_alerts_severity ON Alerts(severity);
CREATE INDEX idx_alerts_timestamp ON Alerts(timestamp);
CREATE INDEX idx_alerts_resolved ON Alerts(resolved);

-- Verify with:
-- SHOW INDEX FROM Alerts;
