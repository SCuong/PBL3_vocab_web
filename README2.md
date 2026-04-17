<<<<<<< HEAD
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/376cd535-5c05-460f-8f74-d8bd10fe928c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
=======
# PBL3\_vocab\_web

PBL3 – Basic English vocabulary learning web application



\# ImportVocabularyPBL3



.NET Framework utility for bootstrapping the `PBL3` database and importing vocabulary data from Excel.



\## Requirements



\- Visual Studio 2022 or later

\- .NET Framework 4.7.2 Developer Pack

\- SQL Server Express or Full



\## Setup and Run



1\. Clone the repository



&#x20;  ```bash

&#x20;  git clone https://github.com/SCuong/pbl3\_vocab\_web.git

&#x20;  ```



2\. Open the solution



&#x20;  Open `database/ImportVocabularyPBL3/ImportVocabularyPBL3.sln` in Visual Studio 2026.



3\. Configure SQL Server



&#x20;  Update `App.config` if your SQL Server is not the default local instance.



&#x20;  Default connection string:



&#x20;  ```xml

&#x20;  Server=.;Database=PBL3;Trusted\_Connection=True;TrustServerCertificate=True;

&#x20;  ```



&#x20;  Note: if a database named `PBL3` already exists delete/drop that database before running the tool.



4\. Verify input files



&#x20;  - Bootstrap script: `Scripts/PBL3.bootstrap.sql`

&#x20;  - Excel source: `Data/vocab.xlsx`



5\. Build and run



&#x20;  - Build Solution

&#x20;  - Press `F5` to run



\## What the tool does



When the application runs, it will:



\- Create the `PBL3` database if it does not already exist

\- Execute the bootstrap SQL script

\- Import vocabulary data from the Excel file



>>>>>>> c3716feb33a07df8b0c14cdab51b3691c2d57e2b
