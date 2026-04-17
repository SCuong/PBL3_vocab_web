using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using VocabLearning.Constants;
using VocabLearning.Services;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Controllers
{
    [Authorize(Roles = UserRoles.Admin)]
    public class AdminController : Controller
    {
        private readonly CustomAuthenticationService _authenticationService;
        private readonly AdminDataService _adminDataService;

        public AdminController(
            CustomAuthenticationService authenticationService,
            AdminDataService adminDataService)
        {
            _authenticationService = authenticationService;
            _adminDataService = adminDataService;
        }

        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public IActionResult LearningOverview(
            long? userId,
            long? topicId,
            DateTime? fromDate,
            DateTime? toDate,
            string? sortBy,
            string? sortDirection,
            int page = 1,
            int pageSize = 20)
        {
            var users = _adminDataService.GetUsers();
            var topics = _adminDataService.GetTopics();
            var rows = _adminDataService.GetLearningOverviewRows(userId, topicId, fromDate, toDate);

            var normalizedSortBy = NormalizeSortBy(sortBy);
            var normalizedSortDirection = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase)
                ? "asc"
                : "desc";

            var sortedRows = SortRows(rows, normalizedSortBy, normalizedSortDirection);
            var safePageSize = pageSize <= 0 ? 20 : pageSize;
            var safePage = page <= 0 ? 1 : page;
            var totalRows = sortedRows.Count;
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalRows / (double)safePageSize));
            if (safePage > totalPages)
            {
                safePage = totalPages;
            }

            var pagedRows = sortedRows
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToList();

            var model = new LearningOverviewViewModel
            {
                SelectedUserId = userId,
                SelectedTopicId = topicId,
                FromDate = fromDate?.Date,
                ToDate = toDate?.Date,
                UserOptions = users
                    .Select(user => new SelectListItem(user.Username, user.UserId.ToString(), userId == user.UserId))
                    .ToList(),
                TopicOptions = topics
                    .Select(topic => new SelectListItem(topic.Name, topic.TopicId.ToString(), topicId == topic.TopicId))
                    .ToList(),
                Rows = rows,
                PagedRows = pagedRows,
                SortBy = normalizedSortBy,
                SortDirection = normalizedSortDirection,
                Page = safePage,
                PageSize = safePageSize,
                TotalRows = totalRows
            };

            return View(model);
        }

        private static string NormalizeSortBy(string? sortBy)
        {
            return sortBy?.Trim().ToLowerInvariant() switch
            {
                "user" => "user",
                "topic" => "topic",
                "sessions" => "sessions",
                "words" => "words",
                "activeminutes" => "activeminutes",
                "firstactivity" => "firstactivity",
                "lastactivity" => "lastactivity",
                _ => "lastactivity"
            };
        }

        private static List<LearningOverviewRowViewModel> SortRows(
            List<LearningOverviewRowViewModel> rows,
            string sortBy,
            string sortDirection)
        {
            var isAsc = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);

            IOrderedEnumerable<LearningOverviewRowViewModel> ordered = sortBy switch
            {
                "user" => isAsc
                    ? rows.OrderBy(item => item.Username, StringComparer.OrdinalIgnoreCase)
                    : rows.OrderByDescending(item => item.Username, StringComparer.OrdinalIgnoreCase),
                "topic" => isAsc
                    ? rows.OrderBy(item => item.TopicName, StringComparer.OrdinalIgnoreCase)
                    : rows.OrderByDescending(item => item.TopicName, StringComparer.OrdinalIgnoreCase),
                "sessions" => isAsc
                    ? rows.OrderBy(item => item.SessionCount)
                    : rows.OrderByDescending(item => item.SessionCount),
                "words" => isAsc
                    ? rows.OrderBy(item => item.WordsStudied)
                    : rows.OrderByDescending(item => item.WordsStudied),
                "activeminutes" => isAsc
                    ? rows.OrderBy(item => item.ActiveMinutes)
                    : rows.OrderByDescending(item => item.ActiveMinutes),
                "firstactivity" => isAsc
                    ? rows.OrderBy(item => item.FirstActivityAt)
                    : rows.OrderByDescending(item => item.FirstActivityAt),
                _ => isAsc
                    ? rows.OrderBy(item => item.LastActivityAt)
                    : rows.OrderByDescending(item => item.LastActivityAt)
            };

            return ordered
                .ThenBy(item => item.Username, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.TopicName, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        [HttpGet]
        public async Task<IActionResult> Users(CancellationToken cancellationToken)
        {
            var users = await _authenticationService.GetUsersAsync(cancellationToken);
            return View(users);
        }

        [HttpGet]
        public IActionResult CreateUser()
        {
            return View(BuildFormModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateUser(AdminUserFormViewModel model, CancellationToken cancellationToken)
        {
            model.IsEditMode = false;
            PopulateFormOptions(model);

            if (string.IsNullOrWhiteSpace(model.Password))
            {
                ModelState.AddModelError(nameof(model.Password), "Password is required.");
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = await _authenticationService.CreateUserAsync(
                model.Username,
                model.Email,
                model.Password ?? string.Empty,
                model.Role,
                model.Status,
                cancellationToken);

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "User could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "User created successfully.";
            return RedirectToAction(nameof(Users));
        }

        [HttpGet]
        public async Task<IActionResult> EditUser(long id, CancellationToken cancellationToken)
        {
            var user = await _authenticationService.GetUserByIdAsync(id, cancellationToken);

            if (user is null)
            {
                return NotFound();
            }

            return View(BuildFormModel(user));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditUser(AdminUserFormViewModel model, CancellationToken cancellationToken)
        {
            model.IsEditMode = true;
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var currentUserId = await GetCurrentUserIdAsync(cancellationToken);
            if (!currentUserId.HasValue)
            {
                return await RedirectToLoginAsync();
            }

            var result = await _authenticationService.UpdateUserAsync(
                model.UserId,
                model.Username,
                model.Email,
                model.Password,
                model.Role,
                model.Status,
                currentUserId.Value,
                cancellationToken);

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "User could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "User updated successfully.";
            return RedirectToAction(nameof(Users));
        }

        [HttpGet]
        public async Task<IActionResult> DeleteUser(long id, CancellationToken cancellationToken)
        {
            var user = await _authenticationService.GetUserByIdAsync(id, cancellationToken);

            if (user is null)
            {
                return NotFound();
            }

            return View(user);
        }

        [HttpPost, ActionName("DeleteUser")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteUserConfirmed(long id, CancellationToken cancellationToken)
        {
            var currentUserId = await GetCurrentUserIdAsync(cancellationToken);
            if (!currentUserId.HasValue)
            {
                return await RedirectToLoginAsync();
            }

            var result = await _authenticationService.DeleteUserAsync(id, currentUserId.Value, cancellationToken);

            if (!result.Succeeded)
            {
                TempData["ErrorMessage"] = result.ErrorMessage ?? "User could not be deleted.";
                return RedirectToAction(nameof(Users));
            }

            TempData["SuccessMessage"] = "User deleted successfully.";
            return RedirectToAction(nameof(Users));
        }

        private static AdminUserFormViewModel BuildFormModel()
        {
            var model = new AdminUserFormViewModel();
            PopulateFormOptions(model);
            return model;
        }

        private static AdminUserFormViewModel BuildFormModel(Models.Users user)
        {
            var model = new AdminUserFormViewModel
            {
                UserId = user.UserId,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                Status = user.Status,
                IsEditMode = true
            };

            PopulateFormOptions(model);
            return model;
        }

        private static void PopulateFormOptions(AdminUserFormViewModel model)
        {
            model.AvailableRoles = new List<SelectListItem>
            {
                new(UserRoles.Admin, UserRoles.Admin, string.Equals(model.Role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)),
                new(UserRoles.Learner, UserRoles.Learner, string.Equals(model.Role, UserRoles.Learner, StringComparison.OrdinalIgnoreCase))
            };

            model.AvailableStatuses = new List<SelectListItem>
            {
                new(UserStatuses.Active, UserStatuses.Active, string.Equals(model.Status, UserStatuses.Active, StringComparison.OrdinalIgnoreCase)),
                new(UserStatuses.Inactive, UserStatuses.Inactive, string.Equals(model.Status, UserStatuses.Inactive, StringComparison.OrdinalIgnoreCase))
            };
        }

        private async Task<long?> GetCurrentUserIdAsync(CancellationToken cancellationToken)
        {
            var currentUser = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            return currentUser is not null
                && string.Equals(currentUser.Role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)
                ? currentUser.UserId
                : null;
        }

        private async Task<IActionResult> RedirectToLoginAsync()
        {
            await _authenticationService.SignOutAsync(HttpContext);
            TempData["ErrorMessage"] = "Your session is no longer valid. Please sign in again.";
            var returnUrl = $"{Request.Path}{Request.QueryString}";
            return RedirectToAction("Login", "Account", new { returnUrl });
        }
    }
}
