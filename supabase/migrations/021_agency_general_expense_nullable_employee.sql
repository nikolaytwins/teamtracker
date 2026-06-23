-- 021 — общие расходы без сотрудника (произвольные: налог, комиссия), как в SQLite v1
ALTER TABLE agency_general_expense ALTER COLUMN employee_name DROP NOT NULL;
ALTER TABLE agency_general_expense ALTER COLUMN employee_role DROP NOT NULL;
