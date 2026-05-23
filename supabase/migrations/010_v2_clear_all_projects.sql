-- 010 — одноразовая очистка всех проектов v2 (чистый лист для /v2/*).
-- v1 (pm_cards, agency_*) не затрагивается.
-- CASCADE: members, links, files, phases. У задач project_id → NULL (ON DELETE SET NULL).

DELETE FROM v2_projects;
