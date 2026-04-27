// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

document.addEventListener('DOMContentLoaded', function () {
    var toggleButtons = document.querySelectorAll('[data-password-toggle]');

    toggleButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var inputGroup = button.closest('.input-group');
            var input = inputGroup ? inputGroup.querySelector('.password-toggle-input') : null;

            if (!input) {
                return;
            }

            var isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            button.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
            button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

            var icon = button.querySelector('[data-password-icon]');
            if (icon) {
                icon.textContent = isPassword ? '🙈' : '👁';
            }
        });
    });
});
