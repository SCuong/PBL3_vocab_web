using System.Configuration;
using Npgsql;

namespace ImportVocabularyPBL3
{
    public static class Db
    {
        public static string GetConnectionString()
        {
            return ConfigurationManager
                .ConnectionStrings["PBL3Db"]
                .ConnectionString;
        }

        public static NpgsqlConnection GetConnection()
        {
            return new NpgsqlConnection(GetConnectionString());
        }
    }
}
