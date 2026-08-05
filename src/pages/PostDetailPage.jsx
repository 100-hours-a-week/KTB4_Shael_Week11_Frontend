import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getStatusMessage } from "../api/errors";
import { CommentSection } from "../components/CommentSection";
import { ConfirmModal, Header, ProtectedImage, Toast } from "../components/common";
import { useToast } from "../hooks/useToast";
import { usePageStyle } from "../hooks/usePageStyle";
import postDetailCss from "../styles/post-detail.css?inline";

export function PostDetailPage() {
  usePageStyle(postDetailCss);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const postId = params.get("postId");
  const { toast, showToast } = useToast();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const images = useMemo(() => [...(post?.postImages ?? [])].sort((a, b) => a.imageOrder - b.imageOrder), [post]);

  useEffect(() => {
    if (!postId) { showToast("해당 게시글을 찾을 수 없습니다."); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await authFetch(`/posts/${postId}`, { signal: controller.signal });
        if (response.ok) { const data = (await response.json()).data; const { commentList, ...postData } = data; setPost(postData); setComments(Array.isArray(commentList) ? commentList : []); }
        else showToast(getStatusMessage(response.status, { 404: "해당 게시글을 찾을 수 없습니다." }));
      } catch (error) { if (error.name !== "AbortError") showToast(ERROR_MESSAGES.network); }
    })();
    return () => controller.abort();
  }, [postId, showToast]);

  async function toggleLike() {
    try {
      const response = await authFetch(`/posts/${postId}/like`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (response.ok) setPost((current) => ({ ...current, liked: body.data.liked ?? body.data.isLiked, likeCount: body.data.likeCount }));
      else showToast(getStatusMessage(response.status, { 403: "본인 게시글에는 좋아요를 누를 수 없습니다.", 404: "해당 게시글을 찾을 수 없습니다." }));
    } catch { showToast(ERROR_MESSAGES.network); }
  }
  async function deletePost() {
    try {
      const response = await authFetch(`/posts/${postId}`, { method: "DELETE" });
      if (response.ok) navigate("/posts/posts.html", { replace: true });
      else showToast(getStatusMessage(response.status, { 403: "삭제 권한이 없습니다.", 404: "해당 게시글을 찾을 수 없습니다." }));
    } catch { showToast(ERROR_MESSAGES.network); }
    finally { setDeleteOpen(false); }
  }

  return <><Header backTo="/posts/posts.html" /><main className="post-detail-page">{post && <article className="post-detail-container"><section className="post-header-section"><div className="content-inner"><h2 className="post-detail-title">{post.title}</h2><div className="post-meta-row"><div className="post-writer-meta"><ProtectedImage className="writer-profile-image" path={post.writerProfileImage} alt="게시글 작성자 프로필 이미지" /><span className="writer-nickname">{post.writerNickname}</span><time className="created-at">{post.createdAt}</time>{post.updatedAt && <span className="edited-label">수정됨</span>}</div>{post.owner && <div className="owner-actions"><button type="button" className="outline-action-button" onClick={() => navigate(`/post-form/post-edit.html?postId=${postId}`)}>수정</button><button type="button" className="outline-action-button" onClick={() => setDeleteOpen(true)}>삭제</button></div>}</div></div></section><div className="section-divider" />
    {images.length > 0 && <section className="post-image-section" aria-label="게시글 이미지"><div className="content-inner"><div className="post-image-slider">{imageIndex > 0 && <button type="button" className="image-nav-button image-nav-button-left" onClick={() => setImageIndex((value) => value - 1)} aria-label="이전 이미지 보기">‹</button>}<ProtectedImage className="post-image" path={images[imageIndex]?.imageUrl} alt={`게시글 이미지 ${imageIndex + 1}`} />{imageIndex < images.length - 1 && <button type="button" className="image-nav-button image-nav-button-right" onClick={() => setImageIndex((value) => value + 1)} aria-label="다음 이미지 보기">›</button>}{images.length > 1 && <div className="image-counter">{imageIndex + 1} / {images.length}</div>}</div></div></section>}
    <section className="post-body-section"><div className="content-inner"><p className="post-body">{post.content}</p></div></section><section className="post-count-section"><div className="post-count-list"><button type="button" className={`count-box like-button ${post.liked ? "active" : "disabled"}`} onClick={toggleLike}><strong>{post.likeCount}</strong><strong>좋아요수</strong></button><div className="count-box"><strong>{post.viewCount}</strong><strong>조회수</strong></div><div className="count-box"><strong>{post.commentCount}</strong><strong>댓글</strong></div></div></section><div className="section-divider" />
    <CommentSection postId={postId} comments={comments} setComments={setComments} setCommentCount={(count) => setPost((current) => ({ ...current, commentCount: count }))} showToast={showToast} /></article>}</main><Toast toast={toast} /><ConfirmModal isOpen={deleteOpen} title="게시글을 삭제하시겠습니까?" description="삭제한 내용은 복구할 수 없습니다." confirmText="삭제" onCancel={() => setDeleteOpen(false)} onConfirm={deletePost} /></>;
}
