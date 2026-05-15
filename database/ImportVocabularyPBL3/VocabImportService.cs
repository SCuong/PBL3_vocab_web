using Npgsql;

namespace ImportVocabularyPBL3.Services
{
    internal class VocabImportService
    {
        private int _topicsCreated, _topicsReused;
        private int _vocabCreated, _vocabReused;
        private int _examplesCreated, _examplesReused;
        private int _rowsOk, _rowsSkipped;

        public void ImportFromExcel(string excelPath)
        {
            var rows = ExcelReader.Read(excelPath);

            using var conn = Db.GetConnection();
            conn.Open();

            using var tran = conn.BeginTransaction();
            int rowIndex = 2;
            var schema = LoadSchema(conn, tran);

            try
            {
                foreach (var row in rows)
                {
                    string sp = $"r{rowIndex}";
                    Exec(conn, tran, $"SAVEPOINT {sp}");
                    try
                    {
                        long? topicId = ResolveTopicId(conn, tran, row, schema);
                        long vocabId = GetOrCreateVocab(conn, tran, row, schema, topicId);
                        long? meaningId = null;

                        if (schema.HasMeaningTable && schema.ExampleHasMeaningId)
                            meaningId = GetOrCreateMeaning(conn, tran, vocabId, row);

                        GetOrCreateExample(conn, tran, schema, vocabId, meaningId, row);
                        AttachTopic(conn, tran, schema, vocabId, topicId);

                        Exec(conn, tran, $"RELEASE SAVEPOINT {sp}");
                        _rowsOk++;
                    }
                    catch (Exception ex)
                    {
                        Exec(conn, tran, $"ROLLBACK TO SAVEPOINT {sp}");
                        _rowsSkipped++;
                        Console.WriteLine($"SKIP row {rowIndex} | Word='{row.Word}' | {ex.Message}");
                    }

                    rowIndex++;
                }

                tran.Commit();
            }
            catch
            {
                tran.Rollback();
                throw;
            }

            PrintSummary();
        }

        private void PrintSummary()
        {
            Console.WriteLine("=== Import complete ===");
            Console.WriteLine($"  Rows: {_rowsOk} ok, {_rowsSkipped} skipped");
            Console.WriteLine($"  Topics:   {_topicsCreated} created, {_topicsReused} reused");
            Console.WriteLine($"  Vocab:    {_vocabCreated} created, {_vocabReused} reused");
            Console.WriteLine($"  Examples: {_examplesCreated} created, {_examplesReused} reused");
        }

        private static void Exec(NpgsqlConnection conn, NpgsqlTransaction tran, string sql)
        {
            using var cmd = new NpgsqlCommand(sql, conn, tran);
            cmd.ExecuteNonQuery();
        }

        private long GetOrCreateVocab(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            ExcelVocabRow row,
            DatabaseSchema schema,
            long? topicId)
        {
            string word = RequireText(row.Word, "Word");
            string level = RequireText(row.Level, "Level");
            string? meaningVi = schema.VocabularyHasMeaningVi
                ? RequireText(row.MeaningVN, "MeaningVN")
                : null;

            var columns = "word, ipa, audio_url, level";
            var values = "@w, @ipa, @audio, @level";

            if (schema.VocabularyHasMeaningVi)
            {
                columns += ", meaning_vi";
                values += ", @vi";
            }

            if (schema.VocabularyHasTopicId)
            {
                columns += ", topic_id";
                values += ", @topicId";
            }

            // ON CONFLICT (word) DO NOTHING: safe for re-runs; RETURNING returns null on conflict.
            using var insert = new NpgsqlCommand(
                $"INSERT INTO vocabulary({columns}) VALUES ({values}) ON CONFLICT (word) DO NOTHING RETURNING vocab_id",
                conn, tran);

            insert.Parameters.AddWithValue("@w", word);
            insert.Parameters.AddWithValue("@ipa", ToDbValue(row.IPA));
            insert.Parameters.AddWithValue("@audio", ToDbValue(row.WordAudioUrl));
            insert.Parameters.AddWithValue("@level", level);

            if (schema.VocabularyHasMeaningVi)
                insert.Parameters.AddWithValue("@vi", meaningVi!);

            if (schema.VocabularyHasTopicId)
                insert.Parameters.AddWithValue("@topicId", RequireTopicId(topicId));

            var newId = insert.ExecuteScalar();
            if (newId != null)
            {
                _vocabCreated++;
                Console.WriteLine($"  VOCAB created: '{word}'");
                return (long)newId;
            }

            using var sel = new NpgsqlCommand(
                "SELECT vocab_id FROM vocabulary WHERE word = @w",
                conn, tran);
            sel.Parameters.AddWithValue("@w", word);
            var existingRaw = sel.ExecuteScalar();
            if (existingRaw == null)
                throw new InvalidOperationException($"Vocabulary word '{word}' not found after ON CONFLICT — unexpected DB state.");
            var existingId = (long)existingRaw;
            _vocabReused++;
            Console.WriteLine($"  VOCAB reused: '{word}' (id={existingId})");
            return existingId;
        }

        private long GetOrCreateMeaning(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            long vocabId,
            ExcelVocabRow row)
        {
            throw new NotSupportedException(
                "Meaning table import not supported: " +
                "meaning_en is NOT NULL in PostgreSQL schema but has no source column in the Excel file. " +
                "Add a MeaningEN column to the Excel and ExcelVocabRow before using this path."
            );
        }

        private long GetOrCreateExample(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            DatabaseSchema schema,
            long vocabId,
            long? meaningId,
            ExcelVocabRow row)
        {
            if (string.IsNullOrWhiteSpace(row.Example))
                return 0;

            string sentence = row.Example.Trim();

            if (string.IsNullOrWhiteSpace(row.ExampleTranslation))
            {
                Console.WriteLine($"  WARN: missing translation for example '{sentence}' — skipping example.");
                return 0;
            }

            string translation = row.ExampleTranslation.Trim();

            string ownerColumn;
            object ownerId;

            if (schema.ExampleHasMeaningId)
            {
                ownerColumn = "meaning_id";
                ownerId = meaningId ?? throw new Exception(
                    "Table example requires meaning_id but meaning table is unavailable.");
            }
            else if (schema.ExampleHasVocabId)
            {
                ownerColumn = "vocab_id";
                ownerId = vocabId;
            }
            else
            {
                throw new Exception("Table example is missing both meaning_id and vocab_id.");
            }

            using var check = new NpgsqlCommand(
                $"SELECT example_id FROM example WHERE {ownerColumn} = @ownerId AND sentence = @s AND translation = @t",
                conn, tran);
            check.Parameters.AddWithValue("@ownerId", ownerId);
            check.Parameters.AddWithValue("@s", sentence);
            check.Parameters.AddWithValue("@t", translation);

            var existing = check.ExecuteScalar();
            if (existing != null)
            {
                _examplesReused++;
                return (long)existing;
            }

            using var insert = new NpgsqlCommand(
                $"INSERT INTO example ({ownerColumn}, sentence, translation, audio_url) " +
                $"VALUES (@ownerId, @s, @t, @a) RETURNING example_id",
                conn, tran);
            insert.Parameters.AddWithValue("@ownerId", ownerId);
            insert.Parameters.AddWithValue("@s", sentence);
            insert.Parameters.AddWithValue("@t", translation);
            insert.Parameters.AddWithValue("@a", ToDbValue(row.ExampleAudioUrl));

            var newExRaw = insert.ExecuteScalar();
            if (newExRaw == null)
                throw new InvalidOperationException("INSERT INTO example returned null — unexpected DB state.");
            _examplesCreated++;
            return (long)newExRaw;
        }

        private long GetOrCreateTopic(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            string name,
            long? parentTopicId,
            bool topicHasParentTopicId)
        {
            string trimmed = name.Trim();

            // INSERT ON CONFLICT (name) DO NOTHING is idempotent for re-runs and
            // safe within the same transaction when the same name appears in multiple rows.
            string insertSql = topicHasParentTopicId
                ? "INSERT INTO topic(name, description, parent_topic_id) VALUES (@name, '', @parentTopicId) ON CONFLICT (name) DO NOTHING"
                : "INSERT INTO topic(name, description) VALUES (@name, '') ON CONFLICT (name) DO NOTHING";

            using var insert = new NpgsqlCommand(insertSql, conn, tran);
            insert.Parameters.AddWithValue("@name", trimmed);
            if (topicHasParentTopicId)
                insert.Parameters.AddWithValue("@parentTopicId",
                    parentTopicId.HasValue ? (object)parentTopicId.Value : DBNull.Value);

            bool created = insert.ExecuteNonQuery() > 0;

            using var sel = new NpgsqlCommand(
                "SELECT topic_id FROM topic WHERE name = @name",
                conn, tran);
            sel.Parameters.AddWithValue("@name", trimmed);
            var raw = sel.ExecuteScalar();
            if (raw == null)
                throw new InvalidOperationException($"Topic '{trimmed}' not found after INSERT ON CONFLICT — unexpected DB state.");
            long id = (long)raw;

            if (created)
            {
                _topicsCreated++;
                Console.WriteLine($"  TOPIC created: '{trimmed}' (id={id})");
            }
            else
            {
                _topicsReused++;
                Console.WriteLine($"  TOPIC reused: '{trimmed}' (id={id})");
            }

            return id;
        }

        private void InsertVocabTopic(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            long vocabId,
            long topicId)
        {
            using var check = new NpgsqlCommand(
                "SELECT 1 FROM vocab_topic WHERE vocab_id = @v AND topic_id = @t",
                conn, tran);
            check.Parameters.AddWithValue("@v", vocabId);
            check.Parameters.AddWithValue("@t", topicId);

            if (check.ExecuteScalar() != null) return;

            using var insert = new NpgsqlCommand(
                "INSERT INTO vocab_topic(vocab_id, topic_id) VALUES (@v, @t)",
                conn, tran);
            insert.Parameters.AddWithValue("@v", vocabId);
            insert.Parameters.AddWithValue("@t", topicId);
            insert.ExecuteNonQuery();
        }

        private void AttachTopic(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            DatabaseSchema schema,
            long vocabId,
            long? topicId)
        {
            if (!schema.HasVocabTopicTable) return;
            InsertVocabTopic(conn, tran, vocabId, RequireTopicId(topicId));
        }

        private static string RequireText(string? value, string fieldName)
        {
            var normalized = value?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
                throw new Exception($"{fieldName} is required.");
            return normalized;
        }

        private static object ToDbValue(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? (object)DBNull.Value
                : value.Trim();
        }

        private long? ResolveTopicId(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            ExcelVocabRow row,
            DatabaseSchema schema)
        {
            if (!schema.VocabularyHasTopicId && !schema.HasVocabTopicTable)
                return null;

            long? parentTopicId = null;

            if (schema.TopicHasParentTopicId && !string.IsNullOrWhiteSpace(row.Category))
            {
                parentTopicId = GetOrCreateTopic(
                    conn, tran,
                    RequireText(row.Category, "Category"),
                    null,
                    schema.TopicHasParentTopicId);
            }

            return GetOrCreateTopic(
                conn, tran,
                RequireText(row.Subcategory, "Subcategory"),
                parentTopicId,
                schema.TopicHasParentTopicId);
        }

        private static long RequireTopicId(long? topicId)
        {
            if (!topicId.HasValue)
                throw new Exception("TopicId is required.");
            return topicId.Value;
        }

        private DatabaseSchema LoadSchema(NpgsqlConnection conn, NpgsqlTransaction tran)
        {
            return new DatabaseSchema
            {
                VocabularyHasMeaningVi = ColumnExists(conn, tran, "vocabulary", "meaning_vi"),
                VocabularyHasTopicId = ColumnExists(conn, tran, "vocabulary", "topic_id"),
                HasMeaningTable = TableExists(conn, tran, "meaning"),
                ExampleHasMeaningId = ColumnExists(conn, tran, "example", "meaning_id"),
                ExampleHasVocabId = ColumnExists(conn, tran, "example", "vocab_id"),
                HasVocabTopicTable = TableExists(conn, tran, "vocab_topic"),
                TopicHasParentTopicId = ColumnExists(conn, tran, "topic", "parent_topic_id")
            };
        }

        private bool TableExists(NpgsqlConnection conn, NpgsqlTransaction tran, string tableName)
        {
            using var cmd = new NpgsqlCommand(
                "SELECT 1 FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_name = @tableName",
                conn, tran);
            cmd.Parameters.AddWithValue("@tableName", tableName);
            return cmd.ExecuteScalar() != null;
        }

        private bool ColumnExists(NpgsqlConnection conn, NpgsqlTransaction tran, string tableName, string columnName)
        {
            using var cmd = new NpgsqlCommand(
                "SELECT 1 FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = @tableName AND column_name = @columnName",
                conn, tran);
            cmd.Parameters.AddWithValue("@tableName", tableName);
            cmd.Parameters.AddWithValue("@columnName", columnName);
            return cmd.ExecuteScalar() != null;
        }

        private sealed class DatabaseSchema
        {
            public bool VocabularyHasMeaningVi { get; set; }
            public bool VocabularyHasTopicId { get; set; }
            public bool HasMeaningTable { get; set; }
            public bool ExampleHasMeaningId { get; set; }
            public bool ExampleHasVocabId { get; set; }
            public bool HasVocabTopicTable { get; set; }
            public bool TopicHasParentTopicId { get; set; }
        }
    }
}
