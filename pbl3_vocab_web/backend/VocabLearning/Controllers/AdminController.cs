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

        public AdminController(CustomAuthenticationService authenticationService)
        {
            _authenticationService = authenticationService;
        }

        [HttpGet]
        public IActionResult Index()
        {
            return View();
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
            model.AvailableRoles = BuildRoleOptions(model.Role);
            model.AvailableStatuses = BuildStatusOptions(model.Status);
        }

        private static IReadOnlyList<SelectListItem> BuildRoleOptions(string? selectedRole)
        {
            return
            [
                new SelectListItem(UserRoles.Admin, UserRoles.Admin, string.Equals(selectedRole, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)),
                new SelectListItem(UserRoles.Learner, UserRoles.Learner, string.Equals(selectedRole, UserRoles.Learner, StringComparison.OrdinalIgnoreCase))
            ];
        }

        private static IReadOnlyList<SelectListItem> BuildStatusOptions(string? selectedStatus)
        {
            return
            [
                new SelectListItem(UserStatuses.Active, UserStatuses.Active, string.Equals(selectedStatus, UserStatuses.Active, StringComparison.OrdinalIgnoreCase)),
                new SelectListItem(UserStatuses.Inactive, UserStatuses.Inactive, string.Equals(selectedStatus, UserStatuses.Inactive, StringComparison.OrdinalIgnoreCase))
            ];
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
