using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;
using VocabLearning.ViewModels.Dashboard;

namespace VocabLearning.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/dashboard")]
    public sealed class DashboardController : ControllerBase
    {
        private readonly IDashboardAnalyticsService _analyticsService;
        private readonly CustomAuthenticationService _authenticationService;

        public DashboardController(
            IDashboardAnalyticsService analyticsService,
            CustomAuthenticationService authenticationService)
        {
            _analyticsService = analyticsService;
            _authenticationService = authenticationService;
        }

        [HttpGet("learner")]
        public async Task<ActionResult<LearnerDashboardApiResponse>> GetLearnerDashboard(CancellationToken cancellationToken)
        {
            var currentUser = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new LearnerDashboardApiResponse
                {
                    Succeeded = false,
                    Message = "Not authenticated."
                });
            }

            var result = await _analyticsService.GetLearnerDashboardAsync(currentUser.UserId, cancellationToken);
            return Ok(result);
        }
    }
}
