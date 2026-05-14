using Npgsql;

namespace ImportVocabularyPBL3.Services
{
    internal class VocabImportService
    {
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
                    try
                    {
                        long? topicId = ResolveTopicId(conn, tran, row, schema);
                        long vocabId = GetOrCreateVocab(conn, tran, row, schema, topicId);
                        long? meaningId = null;

                        // Only call meaning table when example actually needs meaning_id FK.
                        // Current PostgreSQL schema: example.meaning_id does not exist → skip.
                        if (schema.HasMeaningTable && schema.ExampleHasMeaningId)
                        {
                            meaningId = GetOrCreateMeaning(conn, tran, vocabId, row);
                        }

                        GetOrCreateExample(conn, tran, schema, vocabId, meaningId, row);
                        AttachTopic(conn, tran, schema, vocabId, topicId);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(
                            $"SKIP row {rowIndex} | Word='{row.Word}' | Type='{row.Type}' | Reason={ex.Message}"
                        );
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

            // PostgreSQL schema has UNIQUE(word) — check by word only.
            // If word already exists (possibly with different topic/meaning), reuse it.
            using var check = new NpgsqlCommand(
                "SELECT vocab_id FROM vocabulary WHERE word = @w",
                conn, tran);
            check.Parameters.AddWithValue("@w", word);

            var id = check.ExecuteScalar();
            if (id != null) return (long)id;

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

            using var insert = new NpgsqlCommand(
                $"INSERT INTO vocabulary({columns}) VALUES ({values}) RETURNING vocab_id",
                conn, tran);

            insert.Parameters.AddWithValue("@w", word);
            insert.Parameters.AddWithValue("@ipa", ToDbValue(row.IPA));
            insert.Parameters.AddWithValue("@audio", ToDbValue(row.WordAudioUrl));
            insert.Parameters.AddWithValue("@level", level);

            if (schema.VocabularyHasMeaningVi)
                insert.Parameters.AddWithValue("@vi", meaningVi!);

            if (schema.VocabularyHasTopicId)
                insert.Parameters.AddWithValue("@topicId", RequireTopicId(topicId));

            return (long)insert.ExecuteScalar()!;
        }

        private long GetOrCreateMeaning(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            long vocabId,
            ExcelVocabRow row)
        {
            // Only reached when ExampleHasMeaningId = true (not the case in current PostgreSQL schema).
            // PostgreSQL meaning.meaning_en is NOT NULL — requires an English meaning source column in Excel.
            // Add MeaningEN to ExcelVocabRow and ExcelReader before enabling this path.
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
            // PostgreSQL schema: example.sentence and example.translation are NOT NULL and not blank.
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

            var id = check.ExecuteScalar();
            if (id != null) return (long)id;

            using var insert = new NpgsqlCommand(
                $"INSERT INTO example ({ownerColumn}, sentence, translation, audio_url) " +
                $"VALUES (@ownerId, @s, @t, @a) RETURNING example_id",
                conn, tran);
            insert.Parameters.AddWithValue("@ownerId", ownerId);
            insert.Parameters.AddWithValue("@s", sentence);
            insert.Parameters.AddWithValue("@t", translation);
            insert.Parameters.AddWithValue("@a", ToDbValue(row.ExampleAudioUrl));

            return (long)insert.ExecuteScalar()!;
        }

        private long GetOrCreateTopic(
            NpgsqlConnection conn,
            NpgsqlTransaction tran,
            string name,
            long? parentTopicId,
            bool topicHasParentTopicId)
        {
            // topic.name is CITEXT in PostgreSQL — comparison is case-insensitive automatically.
            using var cmd = new NpgsqlCommand(
                "SELECT topic_id FROM topic WHERE name = @name",
                conn, tran);
            cmd.Parameters.AddWithValue("@name", name.Trim());

            var id = cmd.ExecuteScalar();
            if (id != null) return (long)id;

            NpgsqlCommand insert;

            if (topicHasParentTopicId)
            {
                insert = new NpgsqlCommand(
                    "INSERT INTO topic(name, description, parent_topic_id) " +
                    "VALUES (@name, '', @parentTopicId) RETURNING topic_id",
                    conn, tran);
                insert.Parameters.AddWithValue(
                    "@parentTopicId",
                    parentTopicId.HasValue ? (object)parentTopicId.Value : DBNull.Value);
            }
            else
            {
                insert = new NpgsqlCommand(
                    "INSERT INTO topic(name, description) VALUES (@name, '') RETURNING topic_id",
                    conn, tran);
            }

            insert.Parameters.AddWithValue("@name", name.Trim());

            var result = (long)insert.ExecuteScalar()!;
            insert.Dispose();
            return result;
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
