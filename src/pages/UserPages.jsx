import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getFieldError, getStatusMessage } from "../api/errors";
import { FieldError, Header, ProtectedImage, Toast } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { usePageStyle } from "../hooks/usePageStyle";
import { validateNickname, validatePassword, validatePasswordConfirm, validateProfileImage } from "../utils/validation";
import profileCss from "../styles/profile-edit.css?inline";
import passwordCss from "../styles/password-edit.css?inline";

export function ProfileEditPage() {
  usePageStyle(profileCss);
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { user, setUser, clearAuth } = useAuth();
  const { toast, showToast } = useToast();
  const [nickname, setNickname] = useState(user.nickname);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const nicknameResult = validateNickname(nickname);
  const imageResult = validateProfileImage(file);
  const valid = nicknameResult === true && imageResult === true;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function chooseFile(event) {
    const next = event.target.files[0] || null;
    setFile(next); setPreview(next ? URL.createObjectURL(next) : "");
    const result = validateProfileImage(next);
    setErrors((current) => ({ ...current, profileImage: result === true ? "" : result }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append("content", new Blob([JSON.stringify({ nickname })], { type: "application/json" }));
    if (file) formData.append("profileImage", file);
    try {
      const response = await authFetch("/user/info", { method: "PATCH", body: formData });
      const body = await response.json().catch(() => null);
      if (response.ok) { setUser({ ...user, ...body.data }); showToast("수정 완료", "success", 1000); }
      else if (response.status === 400) {
        const fieldError = getFieldError(body, ["nickname", "profileImage"]);
        if (fieldError) setErrors((current) => ({ ...current, [fieldError.field]: fieldError.message })); else showToast(ERROR_MESSAGES.request);
      } else showToast(getStatusMessage(response.status));
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setSubmitting(false); }
  }
  async function withdraw() {
    try {
      const response = await authFetch("/withdrawal", { method: "DELETE" });
      if (response.ok) { clearAuth(); showToast("탈퇴 완료", "success", 1000); setTimeout(() => navigate("/login/login.html", { replace: true }), 1000); }
      else showToast(getStatusMessage(response.status));
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setWithdrawOpen(false); }
  }

  return <><Header backTo="/posts/posts.html" /><main className="profile-edit-page"><section className="profile-edit-container"><h2 className="profile-edit-title">회원정보수정</h2><form className="profile-edit-form" onSubmit={submit}>
    <div className="profile-image-section"><label htmlFor="profileImageInput" className="profile-form-label">프로필 사진*</label><div className="profile-image-wrapper">{preview ? <img className="current-profile-image" src={preview} alt="변경할 프로필 이미지" /> : <ProtectedImage className="current-profile-image" path={user.profileImage} alt="현재 프로필 이미지" />}<label htmlFor="profileImageInput" className="profile-image-change-button">변경</label><input ref={fileRef} id="profileImageInput" type="file" className="profile-image-input" accept="image/*" onChange={chooseFile} /><FieldError message={errors.profileImage} className="profile-error-message" /></div></div>
    <div className="profile-field-section"><p className="profile-form-label">이메일</p><p className="user-email-text">{user.email}</p></div>
    <div className="profile-field-section nickname-section"><label htmlFor="nicknameInput" className="profile-form-label">닉네임</label><input id="nicknameInput" required className="nickname-input" maxLength="10" value={nickname} onChange={(e) => setNickname(e.target.value)} onBlur={() => setErrors((current) => ({ ...current, nickname: nicknameResult === true ? "" : nicknameResult }))} placeholder="닉네임을 입력해주세요." /><FieldError message={errors.nickname} className="profile-error-message" /></div>
    <button type="submit" className={`profile-edit-submit-button ${valid ? "active" : "disabled"}`} disabled={!valid || submitting}>수정하기</button></form><button type="button" className="withdraw-button" onClick={() => setWithdrawOpen(true)}>회원 탈퇴</button></section></main>
    <Toast toast={toast} successClassName="profile-edit-toast" />{withdrawOpen && <div className="modal-overlay" aria-hidden="false"><section className="withdraw-modal" role="dialog" aria-modal="true" aria-label="회원탈퇴 하시겠습니까?"><div className="withdraw-modal-content"><h3 className="withdraw-modal-title">회원탈퇴 하시겠습니까?</h3><p className="withdraw-modal-description">작성된 게시글과 댓글은 삭제되지 않습니다.</p><div className="withdraw-modal-actions"><button type="button" className="withdraw-modal-button cancel-button" onClick={() => setWithdrawOpen(false)}>취소</button><button type="button" className="withdraw-modal-button confirm-button" onClick={withdraw}>확인</button></div></div></section></div>}</>;
}

export function PasswordEditPage() {
  usePageStyle(passwordCss);
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const { toast, showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const results = useMemo(() => ({ password: validatePassword(password), confirm: validatePasswordConfirm(password, confirm) }), [confirm, password]);
  const valid = Object.values(results).every((value) => value === true);
  async function submit(event) {
    event.preventDefault(); if (!valid || submitting) return; setSubmitting(true);
    try {
      const response = await authFetch("/user/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json().catch(() => null);
      if (response.ok) { clearAuth(); navigate("/login/login.html", { replace: true }); }
      else if (response.status === 400) {
        const fieldError = getFieldError(body, ["password"]);
        if (fieldError) setErrors((current) => ({ ...current, password: fieldError.message })); else showToast(ERROR_MESSAGES.request);
      } else showToast(getStatusMessage(response.status));
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setSubmitting(false); }
  }
  return <><Header backTo="/posts/posts.html" /><main className="password-edit-page"><section className="password-edit-container"><h2 className="password-edit-title">비밀번호 수정</h2><form className="password-edit-form" onSubmit={submit}>
    <div className="password-field-section"><label htmlFor="passwordInput" className="password-form-label">비밀번호</label><input id="passwordInput" type="password" required className="password-input" value={password} onChange={(e) => { setPassword(e.target.value); if (confirm) setErrors((current) => ({ ...current, confirm: validatePasswordConfirm(e.target.value, confirm) === true ? "" : validatePasswordConfirm(e.target.value, confirm) })); }} onBlur={() => setErrors((current) => ({ ...current, password: results.password === true ? "" : results.password }))} placeholder="비밀번호를 입력하세요" autoComplete="new-password" /><FieldError message={errors.password} className="password-error-message" /></div>
    <div className="password-field-section password-confirm-section"><label htmlFor="passwordConfirmInput" className="password-form-label">비밀번호 확인</label><input id="passwordConfirmInput" type="password" required className="password-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} onBlur={() => setErrors((current) => ({ ...current, confirm: results.confirm === true ? "" : results.confirm }))} placeholder="비밀번호를 한번 더 입력하세요" autoComplete="new-password" /><FieldError message={errors.confirm} className="password-error-message" /></div>
    <button type="submit" className={`password-edit-submit-button ${valid ? "active" : "disabled"}`} disabled={!valid || submitting}>수정하기</button></form></section></main><Toast toast={toast} successClassName="password-edit-toast" /></>;
}
