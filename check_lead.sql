SELECT id, name, phone, workspace_id, column_id FROM leads WHERE email = 'simulated@test.com' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM kanban_columns WHERE workspace_id IN (SELECT workspace_id FROM leads WHERE email = 'simulated@test.com' ORDER BY created_at DESC LIMIT 1);
