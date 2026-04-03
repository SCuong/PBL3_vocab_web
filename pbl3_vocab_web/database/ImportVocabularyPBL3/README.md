# ImportVocabularyPBL3

.NET Framework utility for bootstrapping the `PBL3` database and importing vocabulary data from Excel.

## Requirements

- Visual Studio 2022 or later
- .NET Framework 4.7.2 Developer Pack
- SQL Server Express or Full

## Setup and Run

1. Clone the repository

   ```bash
   git clone https://github.com/SCuong/pbl3_vocab_web.git
   ```

2. Open the solution

   Open `database/ImportVocabularyPBL3/ImportVocabularyPBL3.sln` in Visual Studio.

3. Configure SQL Server

   Update `App.config` if your SQL Server is not the default local instance.

   Default connection string:

   ```xml
   Server=.;Database=PBL3;Trusted_Connection=True;TrustServerCertificate=True;
   ```

   Note: if a database named `PBL3` already exists delete/drop that database before running the tool.

4. Verify input files

   - Bootstrap script: `Scripts/PBL3.bootstrap.sql`
   - Excel source: `Data/vocab.xlsx`

5. Build and run

   - Build Solution
   - Press `F5` to run

## What the tool does

When the application runs, it will:

- Create the `PBL3` database if it does not already exist
- Execute the bootstrap SQL script
- Import vocabulary data from the Excel file
