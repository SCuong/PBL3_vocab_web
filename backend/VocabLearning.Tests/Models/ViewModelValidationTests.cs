using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Tests.Models
{
    public class ViewModelValidationTests
    {
        private static List<ValidationResult> ValidateModel(object model)
        {
            var results = new List<ValidationResult>();
            var context = new ValidationContext(model);
            Validator.TryValidateObject(model, context, results, validateAllProperties: true);
            return results;
        }

        #region RegisterViewModel

        [Fact]
        public void RegisterViewModel_ValidData_ShouldHaveNoErrors()
        {
            var model = new RegisterViewModel
            {
                Name = "testuser",
                Email = "test@example.com",
                Password = "StrongPass1!",
                ConfirmPassword = "StrongPass1!"
            };

            var errors = ValidateModel(model);
            errors.Should().BeEmpty();
        }

        [Fact]
        public void RegisterViewModel_EmptyUsername_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = "",
                Email = "test@example.com",
                Password = "StrongPass1!",
                ConfirmPassword = "StrongPass1!"
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("Username is required"));
        }

        [Fact]
        public void RegisterViewModel_UsernameTooShort_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = "ab", // min 3 chars
                Email = "test@example.com",
                Password = "StrongPass1!",
                ConfirmPassword = "StrongPass1!"
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("between 3 and 50"));
        }

        [Fact]
        public void RegisterViewModel_UsernameTooLong_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = new string('a', 51), // max 50
                Email = "test@example.com",
                Password = "StrongPass1!",
                ConfirmPassword = "StrongPass1!"
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("between 3 and 50"));
        }

        [Fact]
        public void RegisterViewModel_InvalidEmail_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = "testuser",
                Email = "not-an-email",
                Password = "StrongPass1!",
                ConfirmPassword = "StrongPass1!"
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("Email format"));
        }

        [Fact]
        public void RegisterViewModel_PasswordTooShort_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = "testuser",
                Email = "test@example.com",
                Password = "Short1!", // min 8
                ConfirmPassword = "Short1!"
            };

            var errors = ValidateModel(model);
            errors.Should().NotBeEmpty();
        }

        [Fact]
        public void RegisterViewModel_PasswordMismatch_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = "testuser",
                Email = "test@example.com",
                Password = "StrongPass1!",
                ConfirmPassword = "DifferentPass1!"
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("does not match"));
        }

        [Fact]
        public void RegisterViewModel_EmptyPassword_ShouldFail()
        {
            var model = new RegisterViewModel
            {
                Name = "testuser",
                Email = "test@example.com",
                Password = "",
                ConfirmPassword = ""
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("Password is required"));
        }

        #endregion

        #region LoginViewModel

        [Fact]
        public void LoginViewModel_ValidData_ShouldHaveNoErrors()
        {
            var model = new LoginViewModel
            {
                UsernameOrEmail = "testuser",
                Password = "Password123!"
            };

            var errors = ValidateModel(model);
            errors.Should().BeEmpty();
        }

        [Fact]
        public void LoginViewModel_EmptyUsernameOrEmail_ShouldFail()
        {
            var model = new LoginViewModel
            {
                UsernameOrEmail = "",
                Password = "Password123!"
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("Username or email is required"));
        }

        [Fact]
        public void LoginViewModel_EmptyPassword_ShouldFail()
        {
            var model = new LoginViewModel
            {
                UsernameOrEmail = "testuser",
                Password = ""
            };

            var errors = ValidateModel(model);
            errors.Should().Contain(e => e.ErrorMessage!.Contains("Password is required"));
        }

        #endregion

        #region ChangePasswordViewModel

        [Fact]
        public void ChangePasswordViewModel_ValidData_ShouldHaveNoErrors()
        {
            var model = new ChangePasswordViewModel
            {
                CurrentPassword = "OldPass123!",
                NewPassword = "NewPass123!",
                ConfirmNewPassword = "NewPass123!"
            };

            var errors = ValidateModel(model);
            errors.Should().BeEmpty();
        }

        [Fact]
        public void ChangePasswordViewModel_PasswordMismatch_ShouldFail()
        {
            var model = new ChangePasswordViewModel
            {
                CurrentPassword = "OldPass123!",
                NewPassword = "NewPass123!",
                ConfirmNewPassword = "Different123!"
            };

            var errors = ValidateModel(model);
            errors.Should().NotBeEmpty();
        }

        #endregion

        #region VerifyEmailViewModel

        [Fact]
        public void VerifyEmailViewModel_ValidEmail_ShouldHaveNoErrors()
        {
            var model = new VerifyEmailViewModel { Email = "test@example.com" };
            var errors = ValidateModel(model);
            errors.Should().BeEmpty();
        }

        [Fact]
        public void VerifyEmailViewModel_EmptyEmail_ShouldFail()
        {
            var model = new VerifyEmailViewModel { Email = "" };
            var errors = ValidateModel(model);
            errors.Should().NotBeEmpty();
        }

        #endregion
    }
}
