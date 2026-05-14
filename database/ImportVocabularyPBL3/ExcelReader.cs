using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using ClosedXML.Excel;

namespace ImportVocabularyPBL3
{
    public static class ExcelReader
    {
        public static List<ExcelVocabRow> Read(string path)
        {
            var list = new List<ExcelVocabRow>();

            using (var wb = new XLWorkbook(path))
            {
                var ws = wb.Worksheet(1);

                foreach (var row in ws.RowsUsed().Skip(1))
                {
                    var item = new ExcelVocabRow();

                    item.Word = row.Cell(1).GetString();                 // Word
                    item.Type = row.Cell(2).GetString();                 // Type
                    item.Level = row.Cell(3).GetString();                // Level
                    item.MeaningVN = row.Cell(4).GetString();            // Meaning_VN

                    item.Example = row.Cell(5).GetString();              // Example_Sentence
                    item.ExampleTranslation = row.Cell(6).GetString();   // Translation_Example

                    item.Category = row.Cell(7).GetString();             // Category
                    item.Subcategory = row.Cell(8).GetString();          // Subcategory
                    item.IPA = row.Cell(9).GetString();                 // IPA
                    item.WordAudioUrl = row.Cell(10).GetString();        // Audio_URL (Word)
                    item.ExampleAudioUrl = row.Cell(11).GetString();     // Audio_Url_Example

                    // Bỏ qua dòng rỗng 
                    if (!string.IsNullOrWhiteSpace(item.Word))
                    {
                        list.Add(item);
                    }
                }
            }

            return list;
        }
    }
}