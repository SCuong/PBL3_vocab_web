#!/bin/bash

echo "Waiting for SQL Server to start..."
sleep 20

echo "Creating database PBL3..."
/opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" \
  -C -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'PBL3') CREATE DATABASE PBL3;"

echo "Running init.sql..."
/opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" \
  -C -d PBL3 \
  -i /init.sql

echo "Database init complete."