CREATE TABLE IF NOT EXISTS "_jaybi_qa_marker" (purpose TEXT PRIMARY KEY);
INSERT INTO "_jaybi_qa_marker" (purpose) VALUES ('isolated-integration-tests') ON CONFLICT DO NOTHING;
