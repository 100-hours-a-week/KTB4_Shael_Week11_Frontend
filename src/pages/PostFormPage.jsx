import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getFieldError, getStatusMessage } from "../api/errors";
import { protectedPathToFile } from "../api/images";
import { FieldError, Header, ProtectedImage, Toast } from "../components/common";
import { useToast } from "../hooks/useToast";
import { usePageStyle } from "../hooks/usePageStyle";
import { validateContent, validatePostImages, validateTitle } from "../utils/validation";
import postFormCss from "../styles/post-form.css?inline";

function Preview({ image }) {
  if (image.type === "existing") return <ProtectedImage className="image-preview" path={image.value} alt="이미지 미리보기" />;
  return <img className="image-preview" src={image.previewUrl} alt="이미지 미리보기" />;
}

export function PostFormPage({ mode }) {
  usePageStyle(postFormCss);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const postId = params.get("postId");
  const editing = mode === "edit";
  const { toast, showToast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing && Boolean(postId));
  const [submitting, setSubmitting] = useState(false);
  const previewUrlsRef = useRef(new Set());
  const results = useMemo(() => ({ title: validateTitle(title), content: validateContent(content), images: validatePostImages(images) }), [content, images, title]);
  const valid = Object.values(results).every((result) => result === true);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!editing) return;
    if (!postId) { showToast("해당 게시글을 찾을 수 없습니다."); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await authFetch(`/posts/${postId}`, { signal: controller.signal });
        if (response.ok) {
          const post = (await response.json()).data;
          setTitle(post.title); setContent(post.content);
          setImages((post.postImages ?? []).map((image) => ({ type: "existing", value: image.imageUrl, originalFilename: image.originalFilename })));
        } else showToast(getStatusMessage(response.status, { 404: "해당 게시글을 찾을 수 없습니다." }));
      } catch (error) { if (error.name !== "AbortError") showToast(ERROR_MESSAGES.network); }
      finally { setLoading(false); }
    })();
    return () => controller.abort();
  }, [editing, postId, showToast]);

  function addImages(event) {
    const files = Array.from(event.target.files);
    event.target.value = "";
    const additions = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      return { type: "new", file, value: file.name, previewUrl };
    });
    const next = [...images, ...additions];
    const result = validatePostImages(next);
    if (next.length > 5 || files.some((file) => file.name.length > 500)) {
      additions.forEach(({ previewUrl }) => {
        URL.revokeObjectURL(previewUrl);
        previewUrlsRef.current.delete(previewUrl);
      });
      setErrors((current) => ({ ...current, images: result }));
      return;
    }
    setImages(next); setErrors((current) => ({ ...current, images: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("content", new Blob([JSON.stringify({ title, content })], { type: "application/json" }));
      const files = await Promise.all(images.map((image) => image.type === "new" ? image.file : protectedPathToFile(image)));
      files.forEach((file) => formData.append("images", file));
      const response = await authFetch(editing ? `/posts/${postId}` : "/posts", { method: editing ? "PATCH" : "POST", body: formData });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        const id = editing ? postId : body.data.postId;
        navigate(`/post-detail/post-detail.html?postId=${id}`, { replace: true });
      } else if (response.status === 400) {
        const fieldError = getFieldError(body, ["title", "content"]);
        if (fieldError) setErrors((current) => ({ ...current, [fieldError.field]: fieldError.message }));
        else showToast(ERROR_MESSAGES.request);
      } else showToast(getStatusMessage(response.status, { 403: "수정 권한이 없습니다.", 404: "해당 게시글을 찾을 수 없습니다." }));
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setSubmitting(false); }
  }

  const fileText = images.length === 0 ? "파일을 선택해주세요." : images.length === 1 ? images[0].value : `${images[0].value} 외 ${images.length - 1}개`;
  return <><Header backTo="/posts/posts.html" /><main className="post-form-page"><section className="post-form-container"><h2 className="post-form-title">게시글 {editing ? "수정" : "작성"}</h2>
    {loading ? <p aria-busy="true">불러오는 중...</p> : <form className="post-form" onSubmit={submit}><div className="form-section"><label htmlFor="postTitleInput" className="form-label">제목*</label><div className="form-divider" /><input id="postTitleInput" type="text" required className="title-input" maxLength="26" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setErrors((current) => ({ ...current, title: results.title === true ? "" : results.title }))} placeholder="제목을 입력해주세요. (최대 26글자)" /><div className="form-divider" /><FieldError message={errors.title} /></div>
    <div className="form-section content-section"><label htmlFor="postContentInput" className="form-label">내용*</label><div className="form-divider" /><textarea id="postContentInput" required className="content-input" value={content} onChange={(e) => setContent(e.target.value)} onBlur={() => setErrors((current) => ({ ...current, content: results.content === true ? "" : results.content }))} placeholder="내용을 입력해주세요." /><div className="form-divider" /><FieldError message={errors.content} /></div>
    <div className="form-section image-section"><label htmlFor="postImageInput" className="form-label">이미지</label><FieldError message={errors.images} className="error-message image-error" /><div className="file-row"><label htmlFor="postImageInput" className="file-select-button">파일 선택</label><input type="file" id="postImageInput" className="file-input" accept="image/*" multiple onChange={addImages} /><span className="selected-file-text">{fileText}</span></div>
      <div className={`image-preview-list${images.length ? "" : " hidden"}`} aria-label="선택한 이미지 미리보기">{images.map((image, index) => <div className="image-preview-item" key={`${image.type}-${image.value}-${index}`}><Preview image={image} /><button type="button" className="image-remove-button" onClick={() => { if (image.type === "new") { URL.revokeObjectURL(image.previewUrl); previewUrlsRef.current.delete(image.previewUrl); } setImages((current) => current.filter((_, itemIndex) => itemIndex !== index)); setErrors((current) => ({ ...current, images: "" })); }}>×</button></div>)}</div>
    </div><button type="submit" className={`complete-button ${valid ? "active" : "disabled"}`} disabled={!valid || submitting}>{editing ? "수정 완료" : "완료"}</button></form>}
  </section></main><Toast toast={toast} /></>;
}
