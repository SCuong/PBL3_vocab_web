using Npgsql;

namespace ImportVocabularyPBL3
{
    // Verifies PostgreSQL is reachable and schema is applied.
    // Schema is provisioned externally via database/postgres/init.sql — this class does NOT run SQL scripts.
    internal sealed class DatabaseBootstrapper
    {
        public void EnsureReady()
        {
            using var conn = Db.GetConnection();
            conn.Open();

            using var cmd = new NpgsqlCommand(
                "SELECT 1 FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_name = 'vocabulary'",
                conn);

            if (cmd.ExecuteScalar() == null)
            {
                throw new InvalidOperationException(
                    "Table 'vocabulary' not found in PostgreSQL. " +
                    "Apply database/postgres/init.sql to the target database first."
                );
            }
        }
    }
}
