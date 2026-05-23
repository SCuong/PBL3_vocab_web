using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;
using VocabLearning.ViewModels.Leaderboard;

namespace VocabLearning.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/leaderboard")]
    public sealed class LeaderboardController : ControllerBase
    {
        private const int TopN = 20;

        private readonly ILeaderboardService _leaderboardService;
        private readonly ICustomAuthenticationService _authenticationService;

        public LeaderboardController(
            ILeaderboardService leaderboardService,
            ICustomAuthenticationService authenticationService)
        {
            _leaderboardService = leaderboardService;
            _authenticationService = authenticationService;
        }

        [HttpGet]
        public async Task<ActionResult<LeaderboardApiResponse>> GetLeaderboard(CancellationToken cancellationToken)
        {
            var currentUser = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new LeaderboardApiResponse
                {
                    Succeeded = false,
                    Message = "Not authenticated."
                });
            }

            var result = await _leaderboardService.GetLeaderboardAsync(currentUser.UserId, TopN, cancellationToken);
            return Ok(result);
        }
    }
}
