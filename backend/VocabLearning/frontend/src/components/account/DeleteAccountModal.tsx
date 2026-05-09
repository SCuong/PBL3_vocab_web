import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import { authApi } from '../../services/authApi';

type DeleteAccountModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onAddToast?: (message: string, type?: string) => void;
};

export const DeleteAccountModal = ({ isOpen, onClose, onSuccess, onAddToast }: DeleteAccountModalProps) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleDelete = async () => {
        if (isDeleting) return;

        if (!password.trim()) {
            setError('Vui lòng nhập mật khẩu');
            return;
        }

        if (confirmText !== 'DELETE') {
            setError('Vui lòng nhập "DELETE" để xác nhận');
            return;
        }

        setError('');
        setIsDeleting(true);

        try {
            await authApi.deleteAccount({ password });
            onAddToast?.('Tài khoản đã bị xoá thành công.', 'success');
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (error: any) {
            setError(error?.message || 'Không thể xoá tài khoản. Vui lòng kiểm tra mật khẩu.');
            onAddToast?.(error?.message || 'Không thể xoá tài khoản.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (!isDeleting) {
            setPassword('');
            setConfirmText('');
            setError('');
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-t-3xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-white" size={24} />
                                <h2 className="text-xl font-bold text-white">Xoá Tài Khoản</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isDeleting}
                                className="text-white hover:bg-red-700 rounded-full p-1 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-sm font-semibold text-red-900 mb-2">⚠️ Cảnh báo</p>
                                <p className="text-sm text-red-800 leading-relaxed">
                                    Hành động này sẽ xoá tài khoản của bạn vĩnh viễn. Tất cả dữ liệu học tập sẽ bị xóa. Bạn không thể hoàn tác.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nhập mật khẩu để xác nhận
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="Mật khẩu của bạn"
                                    disabled={isDeleting}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nhập "DELETE" để xác nhận
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => {
                                        setConfirmText(e.target.value.toUpperCase());
                                        setError('');
                                    }}
                                    placeholder="Nhập DELETE"
                                    disabled={isDeleting}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 p-6 flex gap-3 justify-end">
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                disabled={isDeleting}
                                className="flex-1"
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDelete}
                                disabled={isDeleting || !password.trim() || confirmText !== 'DELETE'}
                                className="flex-1"
                            >
                                {isDeleting ? 'Đang xoá...' : 'Xoá Tài Khoản'}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
