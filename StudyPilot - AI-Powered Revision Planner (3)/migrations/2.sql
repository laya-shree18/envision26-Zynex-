
CREATE TABLE exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  subject TEXT NOT NULL,
  marks INTEGER NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX idx_exam_results_subject ON exam_results(user_id, subject);
