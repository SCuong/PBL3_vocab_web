using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ImportVocabularyPBL3
{
    public class ExcelVocabRow
    {
        public string Word { get; set; }
        public string Type { get; set; }
        public string Level { get; set; }
        public string MeaningVN { get; set; }
        public string Example { get; set; }              // Example_Sentence
        public string ExampleTranslation { get; set; }   // Translation_Example
        public string Category { get; set; }
        public string Subcategory { get; set; }
        public string IPA { get; set; }
        public string WordAudioUrl { get; set; }         // Audio_URL (Word)
        public string ExampleAudioUrl { get; set; }      // Audio_Url_Example
        public string GetOrCreateTopic { get; set; }
        public string InsertVocabTopic { get; set; }
    }
}
