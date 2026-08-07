import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicFetch } from "../api/client";
import { ERROR_MESSAGES, getFieldError, getStatusMessage } from "../api/errors";
import { FieldError, Toast } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { usePageStyle } from "../hooks/usePageStyle";
import { validateEmail, validateNickname, validatePassword, validatePasswordConfirm, validateProfileImage } from "../utils/validation";
import loginCss from "../styles/login.css?inline";
import signupCss from "../styles/signup.css?inline";
import loginIllustration from "../assets/study-us-login-illustration.svg";

export function LoginPage() {
  usePageStyle(loginCss);
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const { toast, showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const valid = emailResult === true && passwordResult === true;

  useEffect(() => { if (!loading && user) navigate("/posts/posts.html", { replace: true }); }, [loading, navigate, user]);

  async function submit(event) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true); setError("");
    try {
      const { response, body } = await login(email, password);
      if (response.ok) navigate("/posts/posts.html", { replace: true });
      else if (response.status === 400) setError(getFieldError(body, ["email", "password"])?.message || ERROR_MESSAGES.request);
      else if (response.status === 401) setError("이메일 또는 비밀번호를 확인해주세요.");
      else showToast(getStatusMessage(response.status));
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setSubmitting(false); }
  }

  return <><header className="top-banner"><div className="header-inner"><div className="brand-link auth-brand"><span className="brand-mark" aria-hidden="true" /><span className="banner-title">Study Us</span></div></div></header>
    <main className="login-page"><section className="login-visual" aria-label="Study Us 소개"><div><h2>함께 공부하며<br />꾸준히 성장해요.</h2><p>Study Us에서 서로의 질문을 나누고<br />오늘의 학습을 이어가세요.</p></div><div className="login-illustration-panel"><img src={loginIllustration} alt="서로 질문하고 답하는 두 사람" /></div></section><section className="login-container" aria-labelledby="loginTitle"><h2 id="loginTitle" className="login-title">로그인</h2><p className="login-subtitle">다시 만나서 반가워요.</p>
      <form noValidate className="login-form" onSubmit={submit}><div className="login-box">
        <div className="form-group"><label htmlFor="emailInput" className="form-label">이메일</label><input id="emailInput" type="email" required className="form-input" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} onBlur={() => setTouched((v) => ({ ...v, email: true }))} placeholder="이메일을 입력하세요" autoComplete="email" /></div>
        <div className="form-group"><label htmlFor="passwordInput" className="form-label">비밀번호</label><input id="passwordInput" type="password" required className="form-input" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onBlur={() => setTouched((v) => ({ ...v, password: true }))} placeholder="비밀번호를 입력하세요" autoComplete="current-password" /></div>
        <FieldError message={error || (touched.email && emailResult !== true ? emailResult : "") || (touched.password && passwordResult !== true ? passwordResult : "")} />
      </div><button type="submit" className={`login-button${valid ? " active" : ""}`} disabled={!valid || submitting}>로그인</button>
      <button type="button" className="signup-button" onClick={() => navigate("/signup/signup.html")}>회원가입</button></form>
    </section></main><Toast toast={toast} /></>;
}

export function SignupPage() {
  usePageStyle(signupCss);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { toast, showToast } = useToast();
  const [form, setForm] = useState({ email: "", password: "", confirm: "", nickname: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const results = useMemo(() => ({ email: validateEmail(form.email), password: validatePassword(form.password), confirm: validatePasswordConfirm(form.password, form.confirm, true), nickname: validateNickname(form.nickname), profileImage: validateProfileImage(file) }), [file, form]);
  const valid = Object.values(results).every((value) => value === true);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const blur = (key) => setErrors((current) => ({ ...current, [key]: results[key] === true ? "" : results[key] }));

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
    const data = new FormData();
    data.append("content", new Blob([JSON.stringify({ email: form.email, password: form.password, nickname: form.nickname })], { type: "application/json" }));
    if (file) data.append("profileImage", file);
    try {
      const response = await publicFetch("/signup", { method: "POST", body: data });
      if (response.status === 201) navigate("/login/login.html", { replace: true });
      else {
        const body = await response.json().catch(() => null);
        const fieldError = getFieldError(body, ["email", "nickname"]);
        if (response.status === 400 && fieldError) setErrors((current) => ({ ...current, [fieldError.field]: fieldError.message }));
        else showToast(getStatusMessage(response.status));
      }
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setSubmitting(false); }
  }

  return <><header className="top-banner"><div className="header-inner"><button type="button" className="back-button" onClick={() => navigate("/login/login.html")} aria-label="로그인 페이지로 이동">‹</button><div className="brand-link auth-brand"><span className="brand-mark" aria-hidden="true" /><span className="banner-title">Study Us</span></div></div></header>
    <main className="signup-page"><section className="signup-container"><h2 className="signup-title">회원가입</h2><p className="signup-subtitle">함께 공부할 프로필을 만들어보세요.</p><form className="signup-form" noValidate onSubmit={submit}><div className="signup-box">
      <div className="profile-section"><div><p className="profile-label">프로필 사진</p><p className="profile-help">이미지를 선택해 등록할 수 있어요.</p><FieldError message={errors.profileImage} className="error-message profile-error" /></div><div className="profile-upload-wrapper"><button type="button" className="profile-upload-button" onClick={() => inputRef.current?.click()}><span className="profile-plus-icon">+</span>{preview && <img className="profile-preview" src={preview} alt="업로드한 프로필 이미지 미리보기" />}</button><input ref={inputRef} type="file" className="profile-file-input" accept="image/*" onChange={chooseFile} /></div></div>
      {[{ key: "email", label: "이메일", type: "email", placeholder: "이메일을 입력하세요", autoComplete: "email" }, { key: "nickname", label: "닉네임", type: "text", placeholder: "닉네임을 입력하세요", autoComplete: "nickname" }, { key: "password", label: "비밀번호", type: "password", placeholder: "비밀번호를 입력하세요", autoComplete: "new-password" }, { key: "confirm", label: "비밀번호 확인", type: "password", placeholder: "비밀번호를 한번 더 입력하세요", autoComplete: "new-password" }].map((field) => <div className="form-group" key={field.key}><label htmlFor={field.key} className="form-label">{field.label}</label><input id={field.key} type={field.type} required className="form-input" value={form[field.key]} onChange={(e) => update(field.key, e.target.value)} onBlur={() => blur(field.key)} placeholder={field.placeholder} autoComplete={field.autoComplete} /><FieldError message={errors[field.key]} /></div>)}
    </div><button type="submit" className={`signup-button ${valid ? "active" : "disabled"}`} disabled={!valid || submitting}>회원가입</button><button type="button" className="login-move-button" onClick={() => navigate("/login/login.html")}>로그인하러 가기</button></form></section></main><Toast toast={toast} /></>;
}
