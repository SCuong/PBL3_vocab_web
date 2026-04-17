using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace ImportVocabularyPBL3
{
    internal sealed class DatabaseBootstrapper
    {
        public void EnsureReady(string schemaScriptPath)
        {
            EnsureDatabaseExists();

            var resolvedScriptPath = ProjectFileLocator.ResolveExistingFile(schemaScriptPath);
            var script = File.ReadAllText(resolvedScriptPath);

            ExecuteScript(script);
        }

        private void EnsureDatabaseExists()
        {
            var builder = Db.GetConnectionStringBuilder();
            var databaseName = builder.InitialCatalog;

            if (string.IsNullOrWhiteSpace(databaseName))
            {
                throw new InvalidOperationException(
                    "Connection string 'PBL3Db' must include a database name."
                );
            }

            using (var conn = Db.GetMasterConnection())
            {
                conn.Open();

                using (var exists = new SqlCommand("SELECT DB_ID(@databaseName)", conn))
                {
                    exists.Parameters.AddWithValue("@databaseName", databaseName);

                    var databaseId = exists.ExecuteScalar();
                    if (databaseId != null && databaseId != DBNull.Value)
                    {
                        return;
                    }
                }

                using (var create = new SqlCommand(
                    string.Format("CREATE DATABASE {0}", QuoteIdentifier(databaseName)),
                    conn))
                {
                    create.CommandTimeout = 0;
                    create.ExecuteNonQuery();
                }
            }
        }

        private void ExecuteScript(string script)
        {
            var batches = SplitBatches(script);

            using (var conn = Db.GetConnection())
            {
                conn.Open();

                foreach (var batch in batches)
                {
                    using (var cmd = new SqlCommand(batch, conn))
                    {
                        cmd.CommandTimeout = 0;
                        cmd.ExecuteNonQuery();
                    }
                }
            }
        }

        private static IEnumerable<string> SplitBatches(string script)
        {
            return Regex
                .Split(
                    script,
                    @"^\s*GO\s*;?\s*(?:--.*)?$",
                    RegexOptions.IgnoreCase | RegexOptions.Multiline
                )
                .Select(batch => batch.Trim())
                .Where(batch => batch.Length > 0);
        }

        private static string QuoteIdentifier(string name)
        {
            return "[" + name.Replace("]", "]]") + "]";
        }
    }
}
