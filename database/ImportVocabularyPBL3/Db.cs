using Microsoft.Data.SqlClient;
using System.Configuration;

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

        public static SqlConnectionStringBuilder GetConnectionStringBuilder()
        {
            return new SqlConnectionStringBuilder(GetConnectionString());
        }

        public static SqlConnection GetConnection()
        {
            return new SqlConnection(GetConnectionString());
        }

        public static SqlConnection GetMasterConnection()
        {
            var builder = GetConnectionStringBuilder();
            builder.InitialCatalog = "master";

            return new SqlConnection(builder.ConnectionString);
        }
    }
}
