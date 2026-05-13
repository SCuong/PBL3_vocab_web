export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordPolicyResult {
    minLength: boolean;
    maxLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
}

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
    return {
        minLength: password.length >= PASSWORD_MIN_LENGTH,
        maxLength: password.length <= PASSWORD_MAX_LENGTH,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
}

export function isPasswordPolicyValid(policy: PasswordPolicyResult): boolean {
    return Object.values(policy).every(Boolean);
}

export const PASSWORD_POLICY_LABELS: [keyof Omit<PasswordPolicyResult, 'maxLength'>, string][] = [
    ['minLength', `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`],
    ['hasLowercase', 'Có ít nhất 1 chữ thường'],
    ['hasUppercase', 'Có ít nhất 1 chữ in hoa'],
    ['hasNumber', 'Có ít nhất 1 chữ số'],
    ['hasSpecial', 'Có ít nhất 1 ký tự đặc biệt'],
];
