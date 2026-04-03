using System;
using System.Configuration;
using ImportVocabularyPBL3.Services;

namespace ImportVocabularyPBL3
{
    internal class Program
    {
        static int Main(string[] args)
        {
            try
            {
                var schemaScriptPath =
                    ConfigurationManager.AppSettings["SchemaScriptPath"]
                    ?? @"Scripts\PBL3.bootstrap.sql";
                var excelPath =
                    ConfigurationManager.AppSettings["ExcelPath"]
                    ?? @"Data\vocab.xlsx";

                var bootstrapper = new DatabaseBootstrapper();
                var importer = new VocabImportService();

                Console.WriteLine("Ensuring database is ready...");
                bootstrapper.EnsureReady(schemaScriptPath);

                Console.WriteLine("Importing vocabulary...");
                importer.ImportFromExcel(ProjectFileLocator.ResolveExistingFile(excelPath));

                Console.WriteLine("IMPORT DONE");
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("IMPORT FAILED");
                Console.Error.WriteLine(ex.Message);
                return 1;
            }
            finally
            {
                if (!Console.IsInputRedirected)
                {
                    Console.ReadKey();
                }
            }
        }
    }
}
