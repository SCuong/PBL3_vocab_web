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

WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:5152
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5152

ENTRYPOINT ["dotnet", "VocabLearning.dll"]
