-- Run after importing rows with explicit identity values.

SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('topic', 'topic_id'), COALESCE((SELECT MAX(topic_id) FROM topic), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('vocabulary', 'vocab_id'), COALESCE((SELECT MAX(vocab_id) FROM vocabulary), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('example', 'example_id'), COALESCE((SELECT MAX(example_id) FROM example), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('exercise', 'exercise_id'), COALESCE((SELECT MAX(exercise_id) FROM exercise), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('exercise_session', 'session_id'), COALESCE((SELECT MAX(session_id) FROM exercise_session), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('exercise_result', 'result_id'), COALESCE((SELECT MAX(result_id) FROM exercise_result), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('learning_log', 'log_id'), COALESCE((SELECT MAX(log_id) FROM learning_log), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('meaning', 'meaning_id'), COALESCE((SELECT MAX(meaning_id) FROM meaning), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('password_reset_token', 'password_reset_token_id'), COALESCE((SELECT MAX(password_reset_token_id) FROM password_reset_token), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('email_verification_token', 'email_verification_token_id'), COALESCE((SELECT MAX(email_verification_token_id) FROM email_verification_token), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('sticky_note', 'sticky_note_id'), COALESCE((SELECT MAX(sticky_note_id) FROM sticky_note), 0) + 1, false);
