FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY VocabLearning.csproj ./
RUN dotnet restore VocabLearning.csproj

COPY . ./
RUN dotnet publish VocabLearning.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# curl: required by HEALTHCHECK; app: unprivileged runtime user.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home /app --shell /usr/sbin/nologin app \
    && install -d -o app -g app /app /app/avatars

WORKDIR /app

COPY --from=build --chown=app:app /app/publish ./

ENV ASPNETCORE_URLS=http://+:5152
ENV ASPNETCORE_ENVIRONMENT=Production

USER app

EXPOSE 5152

# Healthcheck hits /health/live; readiness check (DB) is separate at /health/ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent --show-error http://localhost:5152/health/live || exit 1

ENTRYPOINT ["dotnet", "VocabLearning.dll"]
