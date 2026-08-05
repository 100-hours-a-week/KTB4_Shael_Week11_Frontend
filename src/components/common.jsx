import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useProtectedImage } from "../hooks/useProtectedImage";
import { useState } from "react";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main aria-busy="true" className="loading-page">불러오는 중...</main>;
  if (!user) return <Navigate to="/login/login.html" replace state={{ from: location }} />;
  return children;
}

export function ProtectedImage({ path, ...props }) {
  const src = useProtectedImage(path);
  return <img {...props} src={src || undefined} />;
}

export function Header({ backTo, profile = true }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return <header className="top-banner">
    {backTo && <button type="button" className="back-button" onClick={() => navigate(backTo)} aria-label="이전 페이지로 이동">&lt;</button>}
    <h1 className="banner-title">아무 말 대잔치</h1>
    {profile && <div className="header-profile-area">
      <button type="button" className="header-profile-button" onClick={() => setOpen((value) => !value)} aria-label="프로필 메뉴 열기" aria-haspopup="true" aria-expanded={open}>
        <ProtectedImage className="header-profile-image" path={user?.profileImage} alt="사용자 프로필 이미지" />
      </button>
      <nav className={`profile-dropdown${open ? "" : " hidden"}`} aria-label="프로필 메뉴">
        <button type="button" className="dropdown-item" onClick={() => navigate("/profile-edit/profile-edit.html")}>회원정보 수정</button>
        <button type="button" className="dropdown-item" onClick={() => navigate("/password-edit/password-edit.html")}>비밀번호 수정</button>
        <button type="button" className="dropdown-item" onClick={async () => { await logout(); navigate("/login/login.html", { replace: true }); }}>로그아웃</button>
      </nav>
    </div>}
  </header>;
}

export function Toast({ toast, successClassName }) {
  if (!toast) return null;
  const className = toast.type === "success" && successClassName ? successClassName : "server-error-toast";
  return <div className={className} role={toast.type === "error" ? "alert" : "status"} aria-live={toast.type === "error" ? "assertive" : "polite"}>{toast.message}</div>;
}

export function ConfirmModal({ isOpen, title, description, confirmText = "확인", onConfirm, onCancel }) {
  if (!isOpen) return null;
  return <div className="modal-overlay" aria-hidden="false">
    <section className="confirm-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-content"><h2 className="modal-title">{title}</h2><p className="modal-description">{description}</p>
        <div className="modal-button-row">
          <button type="button" className="modal-button modal-cancel-button" onClick={onCancel}>취소</button>
          <button type="button" className="modal-button modal-confirm-button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </section>
  </div>;
}

export function FieldError({ message, className = "error-message" }) {
  return <p className={`${className}${message ? "" : " hidden"}`}>{message || ""}</p>;
}
