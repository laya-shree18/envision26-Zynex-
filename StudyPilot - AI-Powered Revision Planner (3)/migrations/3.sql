CREATE TABLE syllabus_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  chapter TEXT,
  priority TEXT,
  is_completed BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_syllabus_topics_user ON syllabus_topics(user_id);
CREATE INDEX idx_syllabus_topics_subject ON syllabus_topics(user_id, subject);