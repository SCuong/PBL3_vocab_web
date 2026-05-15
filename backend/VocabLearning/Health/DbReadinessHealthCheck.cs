using Microsoft.Extensions.Diagnostics.HealthChecks;
using VocabLearning.Data;

namespace VocabLearning.Health
{
    public sealed class DbReadinessHealthCheck : IHealthCheck
    {
        private readonly AppDbContext _db;

        public DbReadinessHealthCheck(AppDbContext db)
        {
            _db = db;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var canConnect = await _db.Database.CanConnectAsync(cancellationToken);
                return canConnect
                    ? HealthCheckResult.Healthy("PostgreSQL reachable.")
                    : HealthCheckResult.Unhealthy("PostgreSQL unreachable.");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("PostgreSQL probe threw.", ex);
            }
        }
    }
}
