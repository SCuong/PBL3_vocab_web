using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = UserRoles.Admin)]
    public sealed class AdminApiController : ControllerBase
    {
        private readonly ICustomAuthenticationService _authService;
        private readonly IAdminDataService _adminDataService;

        public AdminApiController(
            ICustomAuthenticationService authService,
            IAdminDataService adminDataService)
        {
            _authService = authService;
            _adminDataService = adminDataService;
        }

        // ── Users ─────────────────────────────────────────────────────────────

        [HttpGet("users")]
        public async Task<ActionResult<AdminUserListApiResponse>> GetUsers(CancellationToken cancellationToken)
        {
            var users = await _authService.GetUsersAsync(cancellationToken);
            var dtos = users.Select(MapUser).ToList();
            return Ok(new AdminUserListApiResponse
            {
                Succeeded = true,
                Users = dtos,
                TotalCount = dtos.Count,
            });
        }

        [HttpPost("users")]
        public async Task<ActionResult<AdminUserApiResponse>> CreateUser(
            [FromBody] AdminCreateUserRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest(Fail("Username is required."));
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(Fail("Email is required."));
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(Fail("Password is required."));
            if (string.IsNullOrWhiteSpace(request.Role))
                return BadRequest(Fail("Role is required."));
            if (string.IsNullOrWhiteSpace(request.Status))
                return BadRequest(Fail("Status is required."));

            var result = await _authService.CreateUserAsync(
                request.Username,
                request.Email,
                request.Password,
                request.Role,
                request.Status,
                cancellationToken);

            if (!result.Succeeded || result.User is null)
                return BadRequest(Fail(result.ErrorMessage ?? "User could not be created."));

            return Ok(new AdminUserApiResponse
            {
                Succeeded = true,
                Message = "User created successfully.",
                User = MapUser(result.User),
            });
        }

        [HttpPut("users/{id:long}")]
        public async Task<ActionResult<AdminApiResponse>> UpdateUser(
            long id,
            [FromBody] AdminUpdateUserRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest(Fail("Username is required."));
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(Fail("Email is required."));
            if (string.IsNullOrWhiteSpace(request.Role))
                return BadRequest(Fail("Role is required."));
            if (string.IsNullOrWhiteSpace(request.Status))
                return BadRequest(Fail("Status is required."));

            var currentUserId = await ResolveCurrentAdminIdAsync(cancellationToken);
            if (currentUserId is null)
                return Unauthorized(Fail("Admin session could not be verified."));

            var result = await _authService.UpdateUserAsync(
                id,
                request.Username,
                request.Email,
                request.Password,
                request.Role,
                request.Status,
                currentUserId.Value,
                cancellationToken);

            if (!result.Succeeded)
                return BadRequest(Fail(result.ErrorMessage ?? "User could not be updated."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "User updated successfully." });
        }

        [HttpDelete("users/{id:long}")]
        public async Task<ActionResult<AdminApiResponse>> DeleteUser(
            long id,
            CancellationToken cancellationToken)
        {
            var currentUserId = await ResolveCurrentAdminIdAsync(cancellationToken);
            if (currentUserId is null)
                return Unauthorized(Fail("Admin session could not be verified."));

            var result = await _authService.DeleteUserAsync(id, currentUserId.Value, cancellationToken);

            if (!result.Succeeded)
                return BadRequest(Fail(result.ErrorMessage ?? "User could not be deleted."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "User deleted successfully." });
        }

        // ── Topics ────────────────────────────────────────────────────────────

        [HttpGet("topics")]
        public ActionResult<AdminTopicListApiResponse> GetTopics()
        {
            var topics = _adminDataService.GetTopics();
            var topicDict = topics.ToDictionary(t => t.TopicId);
            var dtos = topics
                .Select(t => MapTopic(t, ResolveParentName(t.ParentTopicId, topicDict)))
                .ToList();

            return Ok(new AdminTopicListApiResponse { Succeeded = true, Topics = dtos });
        }

        [HttpPost("topics")]
        public ActionResult<AdminTopicApiResponse> CreateTopic([FromBody] AdminCreateTopicRequest? request)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(Fail("Name is required."));
            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(Fail("Description is required."));

            var topic = new Topic
            {
                Name = request.Name.Trim(),
                Description = request.Description.Trim(),
                ParentTopicId = request.ParentTopicId,
            };

            var result = _adminDataService.CreateTopic(topic);
            if (!result.Succeeded)
                return BadRequest(Fail(result.ErrorMessage ?? "Topic could not be created."));

            // EF Core populates topic.TopicId after SaveChanges
            var parentName = topic.ParentTopicId.HasValue
                ? _adminDataService.GetTopicById(topic.ParentTopicId.Value)?.Name
                : null;

            return Ok(new AdminTopicApiResponse
            {
                Succeeded = true,
                Message = "Topic created successfully.",
                Topic = MapTopic(topic, parentName),
            });
        }

        [HttpPut("topics/{id:long}")]
        public ActionResult<AdminApiResponse> UpdateTopic(
            long id,
            [FromBody] AdminUpdateTopicRequest? request)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(Fail("Name is required."));
            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(Fail("Description is required."));

            var updatedTopic = new Topic
            {
                TopicId = id,
                Name = request.Name.Trim(),
                Description = request.Description.Trim(),
                ParentTopicId = request.ParentTopicId,
            };

            var isUpdated = _adminDataService.UpdateTopic(updatedTopic);
            if (!isUpdated)
                return BadRequest(Fail("Topic could not be updated. It may not exist, refer to itself as parent, or the parent ID is invalid."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "Topic updated successfully." });
        }

        [HttpDelete("topics/{id:long}")]
        public ActionResult<AdminApiResponse> DeleteTopic(long id)
        {
            var isDeleted = _adminDataService.DeleteTopic(id);
            if (!isDeleted)
                return NotFound(Fail("Topic not found."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "Topic deleted successfully." });
        }

        // ── Learning Overview ─────────────────────────────────────────────────

        [HttpGet("learning-overview")]
        public ActionResult<AdminLearningOverviewApiResponse> GetLearningOverview(
            long? userId = null,
            long? topicId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? sortBy = null,
            string? sortDirection = null,
            int page = 1,
            int pageSize = 20)
        {
            var allRows = _adminDataService.GetLearningOverviewRows(userId, topicId, fromDate, toDate);

            var normalizedSortBy = NormalizeSortBy(sortBy);
            var normalizedSortDir = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase)
                ? "asc" : "desc";

            var sortedRows = SortRows(allRows, normalizedSortBy, normalizedSortDir);

            var safePageSize = pageSize <= 0 ? 20 : pageSize;
            var safePage = Math.Max(1, page);
            var totalRows = sortedRows.Count;
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalRows / (double)safePageSize));
            if (safePage > totalPages) safePage = totalPages;

            var pagedRows = sortedRows
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToList();

            return Ok(new AdminLearningOverviewApiResponse
            {
                Succeeded = true,
                Rows = pagedRows,
                Page = safePage,
                PageSize = safePageSize,
                TotalRows = totalRows,
                TotalPages = totalPages,
                ActiveUserCount = allRows.Select(r => r.UserId).Distinct().Count(),
                LearnedTopicCount = allRows.Select(r => r.TopicId).Distinct().Count(),
                TotalWordsStudied = allRows.Sum(r => r.WordsStudied),
                TotalActiveHours = allRows.Sum(r => r.ActiveMinutes) / 60d,
            });
        }

        // ── Private helpers ───────────────────────────────────────────────────

        private async Task<long?> ResolveCurrentAdminIdAsync(CancellationToken cancellationToken)
        {
            var user = await _authService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            return user is not null
                && string.Equals(user.Role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)
                ? user.UserId
                : null;
        }

        private static AdminApiResponse Fail(string message) =>
            new() { Succeeded = false, Message = message };

        private static AdminUserResponse MapUser(Models.Users user) => new()
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            Status = user.Status,
            HasGoogleLogin = !string.IsNullOrWhiteSpace(user.GoogleSubject),
            HasLocalPassword = !string.IsNullOrWhiteSpace(user.PasswordHash),
            CreatedAt = user.CreatedAt,
            IsDeleted = user.IsDeleted,
            DeletedAt = user.DeletedAt,
        };

        private static AdminTopicResponse MapTopic(Topic topic, string? parentName) => new()
        {
            TopicId = topic.TopicId,
            Name = topic.Name,
            Description = topic.Description,
            ParentTopicId = topic.ParentTopicId,
            ParentTopicName = parentName,
        };

        private static string? ResolveParentName(long? parentTopicId, Dictionary<long, Topic> topicDict)
        {
            if (!parentTopicId.HasValue) return null;
            return topicDict.TryGetValue(parentTopicId.Value, out var parent) ? parent.Name : null;
        }

        private static string NormalizeSortBy(string? sortBy) =>
            sortBy?.Trim().ToLowerInvariant() switch
            {
                "user" => "user",
                "topic" => "topic",
                "sessions" => "sessions",
                "words" => "words",
                "activeminutes" => "activeminutes",
                "firstactivity" => "firstactivity",
                "lastactivity" => "lastactivity",
                _ => "lastactivity",
            };

        private static List<LearningOverviewRowViewModel> SortRows(
            List<LearningOverviewRowViewModel> rows,
            string sortBy,
            string sortDirection)
        {
            var isAsc = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            IOrderedEnumerable<LearningOverviewRowViewModel> ordered = sortBy switch
            {
                "user" => isAsc
                    ? rows.OrderBy(r => r.Username, StringComparer.OrdinalIgnoreCase)
                    : rows.OrderByDescending(r => r.Username, StringComparer.OrdinalIgnoreCase),
                "topic" => isAsc
                    ? rows.OrderBy(r => r.TopicName, StringComparer.OrdinalIgnoreCase)
                    : rows.OrderByDescending(r => r.TopicName, StringComparer.OrdinalIgnoreCase),
                "sessions" => isAsc
                    ? rows.OrderBy(r => r.SessionCount)
                    : rows.OrderByDescending(r => r.SessionCount),
                "words" => isAsc
                    ? rows.OrderBy(r => r.WordsStudied)
                    : rows.OrderByDescending(r => r.WordsStudied),
                "activeminutes" => isAsc
                    ? rows.OrderBy(r => r.ActiveMinutes)
                    : rows.OrderByDescending(r => r.ActiveMinutes),
                "firstactivity" => isAsc
                    ? rows.OrderBy(r => r.FirstActivityAt)
                    : rows.OrderByDescending(r => r.FirstActivityAt),
                _ => isAsc
                    ? rows.OrderBy(r => r.LastActivityAt)
                    : rows.OrderByDescending(r => r.LastActivityAt),
            };

            return ordered
                .ThenBy(r => r.Username, StringComparer.OrdinalIgnoreCase)
                .ThenBy(r => r.TopicName, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }
}
