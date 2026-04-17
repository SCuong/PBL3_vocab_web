using System;
using Microsoft.Data.SqlClient;

namespace ImportVocabularyPBL3.Services
{
    internal class VocabImportService
    {
        public void ImportFromExcel(string excelPath)
        {
            var rows = ExcelReader.Read(excelPath);

            using (var conn = Db.GetConnection())
            {
                conn.Open();

                using (var tran = conn.BeginTransaction())
                {
                    int rowIndex = 2; // dòng Excel (bỏ header)
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

                                if (schema.HasMeaningTable)
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
            }
        }

        private long GetOrCreateVocab(
            SqlConnection conn,
            SqlTransaction tran,
            ExcelVocabRow row,
            DatabaseSchema schema,
            long? topicId)
        {
            string word = RequireText(row.Word, "Word");
            string level = RequireText(row.Level, "Level");
            string meaningVi = schema.VocabularyHasMeaningVi
                ? RequireText(row.MeaningVN, "MeaningVN")
                : null;

            string checkSql = @"
                SELECT vocab_id
                FROM vocabulary
                WHERE LOWER(LTRIM(RTRIM(word))) = LOWER(LTRIM(RTRIM(@w)))";

            if (schema.VocabularyHasMeaningVi)
            {
                checkSql += @"
                  AND LOWER(LTRIM(RTRIM(meaning_vi))) = LOWER(LTRIM(RTRIM(@vi)))";
            }

            if (schema.VocabularyHasTopicId)
            {
                checkSql += @"
                  AND topic_id = @topicId";
            }

            var check = new SqlCommand(checkSql, conn, tran);
            check.Parameters.AddWithValue("@w", word);

            if (schema.VocabularyHasMeaningVi)
            {
                check.Parameters.AddWithValue("@vi", meaningVi);
            }

            if (schema.VocabularyHasTopicId)
            {
                check.Parameters.AddWithValue("@topicId", RequireTopicId(topicId));
            }

            var id = check.ExecuteScalar();
            if (id != null) return (long)id;

            string columns = "word, ipa, audio_url, level";
            string values = "@w, @ipa, @audio, @level";

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

            var insert = new SqlCommand($@"
                INSERT INTO vocabulary({columns})
                OUTPUT INSERTED.vocab_id
                VALUES ({values})",
                conn, tran);

            insert.Parameters.AddWithValue("@w", word);
            insert.Parameters.AddWithValue("@ipa", ToDbValue(row.IPA));
            insert.Parameters.AddWithValue("@audio", ToDbValue(row.WordAudioUrl));
            insert.Parameters.AddWithValue("@level", level);

            if (schema.VocabularyHasMeaningVi)
            {
                insert.Parameters.AddWithValue("@vi", meaningVi);
            }

            if (schema.VocabularyHasTopicId)
            {
                insert.Parameters.AddWithValue("@topicId", RequireTopicId(topicId));
            }

            return (long)insert.ExecuteScalar();
        }
        private long GetOrCreateMeaning(
SqlConnection conn,
     SqlTransaction tran,
     long vocabId,
     ExcelVocabRow row)
        {
            string vi = RequireText(row.MeaningVN, "MeaningVN");
            string type = RequireText(row.Type, "Type");
            object enValue = DBNull.Value;

            var check = new SqlCommand(@"
        SELECT meaning_id
        FROM meaning
        WHERE vocab_id = @vid
          AND (
                (meaning_en IS NULL AND @en IS NULL)
                OR LOWER(LTRIM(RTRIM(meaning_en))) = LOWER(LTRIM(RTRIM(@en)))
              )
          AND LOWER(LTRIM(RTRIM(meaning_vi))) = LOWER(LTRIM(RTRIM(@vi)))
          AND LOWER(LTRIM(RTRIM(type)))       = LOWER(LTRIM(RTRIM(@type)))",
                conn, tran);

            check.Parameters.AddWithValue("@vid", vocabId);
            check.Parameters.AddWithValue("@en", enValue);
            check.Parameters.AddWithValue("@vi", vi);
            check.Parameters.AddWithValue("@type", type);

            var id = check.ExecuteScalar();
            if (id != null) return (long)id;

            var insert = new SqlCommand(@"
        INSERT INTO meaning(vocab_id, meaning_en, meaning_vi, type)
        OUTPUT INSERTED.meaning_id
        VALUES (@vid,@en,@vi,@type)",
                conn, tran);

            insert.Parameters.AddWithValue("@vid", vocabId);
            insert.Parameters.AddWithValue("@en", enValue);
            insert.Parameters.AddWithValue("@vi", vi);
            insert.Parameters.AddWithValue("@type", type);

            return (long)insert.ExecuteScalar();
        }

        private long GetOrCreateExample(
     SqlConnection conn,
     SqlTransaction tran,
     DatabaseSchema schema,
     long vocabId,
     long? meaningId,
     ExcelVocabRow row)
        {
            string ownerColumn;
            object ownerId;

            if (schema.ExampleHasMeaningId)
            {
                ownerColumn = "meaning_id";
                ownerId = meaningId ?? throw new Exception("Table example requires meaning_id but meaning table is unavailable.");
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

            // 1. Kiểm tra example đã tồn tại chưa
            var check = new SqlCommand($@"
        SELECT example_id
        FROM example
        WHERE {ownerColumn} = @ownerId
          AND sentence = @s
          AND (translation = @t OR (translation IS NULL AND @t IS NULL))",
                conn, tran);

            check.Parameters.AddWithValue("@ownerId", ownerId);
            check.Parameters.AddWithValue("@s", row.Example);
            check.Parameters.AddWithValue("@t",
                ToDbValue(row.ExampleTranslation));

            var id = check.ExecuteScalar();
            if (id != null)
                return (long)id;

            // 2. Chưa có → insert
            var insert = new SqlCommand($@"
        INSERT INTO example ({ownerColumn}, sentence, translation, audio_url)
        OUTPUT INSERTED.example_id
        VALUES (@ownerId, @s, @t, @a)",
                conn, tran);

            insert.Parameters.AddWithValue("@ownerId", ownerId);
            insert.Parameters.AddWithValue("@s", row.Example);
            insert.Parameters.AddWithValue("@t", ToDbValue(row.ExampleTranslation));
            insert.Parameters.AddWithValue("@a", ToDbValue(row.ExampleAudioUrl));

            return (long)insert.ExecuteScalar();
        }

        private long GetOrCreateTopic(
    SqlConnection conn,
    SqlTransaction tran,
    string name,
    long? parentTopicId,
    bool topicHasParentTopicId)
        {
            var cmd = new SqlCommand(@"
        SELECT topic_id
        FROM topic
        WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@name)))",
                conn, tran);

            cmd.Parameters.AddWithValue("@name", name.Trim());

            var id = cmd.ExecuteScalar();

            if (id != null)
            {
                return (long)id;
            }

            SqlCommand insert;

            if (topicHasParentTopicId)
            {
                insert = new SqlCommand(@"
        INSERT INTO topic(name, description, parent_topic_id)
        OUTPUT INSERTED.topic_id
        VALUES (@name, NULL, @parentTopicId)",
                    conn, tran);

                insert.Parameters.AddWithValue(
                    "@parentTopicId",
                    parentTopicId.HasValue ? (object)parentTopicId.Value : DBNull.Value
                );
            }
            else
            {
                insert = new SqlCommand(@"
        INSERT INTO topic(name, description)
        OUTPUT INSERTED.topic_id
        VALUES (@name, NULL)",
                    conn, tran);
            }

            insert.Parameters.AddWithValue("@name", name.Trim());

            return (long)insert.ExecuteScalar();
        }
        private void InsertVocabTopic(
  SqlConnection conn,
    SqlTransaction tran,
    long vocabId,
    long topicId)
        {
            var check = new SqlCommand(@"
        SELECT 1
        FROM vocab_topic
        WHERE vocab_id = @v AND topic_id = @t",
                conn, tran);

            check.Parameters.AddWithValue("@v", vocabId);
            check.Parameters.AddWithValue("@t", topicId);

            var exists = check.ExecuteScalar();
            if (exists != null) return;

            var insert = new SqlCommand(@"
        INSERT INTO vocab_topic(vocab_id, topic_id)
        VALUES (@v, @t)",
                conn, tran);

            insert.Parameters.AddWithValue("@v", vocabId);
            insert.Parameters.AddWithValue("@t", topicId);

            insert.ExecuteNonQuery();
        }

        private void AttachTopic(
            SqlConnection conn,
            SqlTransaction tran,
            DatabaseSchema schema,
            long vocabId,
            long? topicId)
        {
            if (!schema.HasVocabTopicTable)
            {
                return;
            }

            InsertVocabTopic(conn, tran, vocabId, RequireTopicId(topicId));
        }

        private static string RequireText(string value, string fieldName)
        {
            var normalized = value?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
            {
                throw new Exception($"{fieldName} is required.");
            }

            return normalized;
        }

        private static object ToDbValue(string value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? (object)DBNull.Value
                : value.Trim();
        }

        private long? ResolveTopicId(
            SqlConnection conn,
            SqlTransaction tran,
            ExcelVocabRow row,
            DatabaseSchema schema)
        {
            if (!schema.VocabularyHasTopicId && !schema.HasVocabTopicTable)
            {
                return null;
            }

            long? parentTopicId = null;

            if (schema.TopicHasParentTopicId && !string.IsNullOrWhiteSpace(row.Category))
            {
                parentTopicId = GetOrCreateTopic(
                    conn,
                    tran,
                    RequireText(row.Category, "Category"),
                    null,
                    schema.TopicHasParentTopicId
                );
            }

            return GetOrCreateTopic(
                conn,
                tran,
                RequireText(row.Subcategory, "Subcategory"),
                parentTopicId,
                schema.TopicHasParentTopicId
            );
        }

        private static long RequireTopicId(long? topicId)
        {
            if (!topicId.HasValue)
            {
                throw new Exception("TopicId is required.");
            }

            return topicId.Value;
        }

        private DatabaseSchema LoadSchema(SqlConnection conn, SqlTransaction tran)
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

        private bool TableExists(
            SqlConnection conn,
            SqlTransaction tran,
            string tableName)
        {
            var cmd = new SqlCommand(@"
                SELECT 1
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = @tableName",
                conn, tran);
            cmd.Parameters.AddWithValue("@tableName", tableName);

            return cmd.ExecuteScalar() != null;
        }

        private bool ColumnExists(
            SqlConnection conn,
            SqlTransaction tran,
            string tableName,
            string columnName)
        {
            var cmd = new SqlCommand(@"
                SELECT 1
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = @tableName
                  AND COLUMN_NAME = @columnName",
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
