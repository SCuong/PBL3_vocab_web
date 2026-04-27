# ─── Stage 1: Build ──────────────────────────────────────────────────────────
# .NET 10 SDK (matches VocabLearning.csproj TargetFramework=net10.0)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder

WORKDIR /src

# Copy csproj first for layer caching
COPY VocabLearning.csproj ./
RUN dotnet restore VocabLearning.csproj

# Copy everything else and publish
COPY . .
RUN dotnet publish VocabLearning.csproj \
    -c Release \
    -o /app/publish

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runner

WORKDIR /app

# Copy published output
COPY --from=builder /app/publish .

# ASP.NET Core listens on 5152 (matches vite.config.ts proxy target)
ENV ASPNETCORE_URLS=http://+:5152
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5152

ENTRYPOINT ["dotnet", "VocabLearning.dll"]
