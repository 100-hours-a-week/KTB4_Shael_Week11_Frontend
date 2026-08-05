import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getStatusMessage } from "../api/errors";
import { Header, ProtectedImage, Toast } from "../components/common";
import { useToast } from "../hooks/useToast";
import { usePageStyle } from "../hooks/usePageStyle";
import postsCss from "../styles/posts.css?inline";

const formatCount = (count) => count >= 1000 ? `${Math.floor((count / 1000) * 10) / 10}k` : count;

export function PostsPage() {
  usePageStyle(postsCss);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const loadMoreTarget = useRef(null);
  const requesting = useRef(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await authFetch("/posts", { signal: controller.signal });
        if (response.ok) {
          const data = (await response.json()).data;
          setPosts(data?.posts ?? []);
          setNextCursor(data?.nextCursor ?? null);
          setHasNext(Boolean(data?.hasNext));
        }
        else showToast(getStatusMessage(response.status));
      } catch (error) { if (error.name !== "AbortError") showToast(ERROR_MESSAGES.network); }
    })();
    return () => controller.abort();
  }, [showToast]);

  const loadMore = useCallback(async () => {
    if (!hasNext || nextCursor === null || requesting.current) return;
    requesting.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const response = await authFetch(`/posts?cursor=${encodeURIComponent(nextCursor)}`);
      if (!response.ok) throw new Error(`posts_fetch_failed_${response.status}`);
      const data = (await response.json()).data;
      setPosts((current) => {
        const byId = new Map(current.map((post) => [post.postId, post]));
        (data?.posts ?? []).forEach((post) => byId.set(post.postId, post));
        return Array.from(byId.values());
      });
      setNextCursor(data?.nextCursor ?? null);
      setHasNext(Boolean(data?.hasNext));
    } catch {
      setLoadMoreFailed(true);
    } finally {
      requesting.current = false;
      setLoadingMore(false);
    }
  }, [hasNext, nextCursor]);

  useEffect(() => {
    const target = loadMoreTarget.current;
    if (!target || !hasNext || loadMoreFailed) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNext, loadMore, loadMoreFailed]);

  return <><Header /><main className="posts-page"><section className="posts-container" aria-labelledby="boardIntroTitle"><div className="board-header"><h2 id="boardIntroTitle" className="board-intro">안녕하세요,<br />아무 말 대잔치 <strong>게시판</strong> 입니다.</h2><button type="button" className="create-post-button" onClick={() => navigate("/post-form/post-create.html")}>게시글 작성</button></div>
    <section className="post-list" aria-label="게시글 목록">{posts.map((post) => <article className="post-card" key={post.postId}><button type="button" className="post-card-button" onClick={() => navigate(`/post-detail/post-detail.html?postId=${post.postId}`)}><div className="post-content"><div className="post-main"><h3 className="post-title">{post.title.length > 26 ? `${post.title.slice(0, 26)}...` : post.title}</h3><div className="post-info-row"><div className="post-stats"><span>좋아요 {formatCount(post.likeCount)}</span><span>댓글 {formatCount(post.commentCount)}</span><span>조회수 {formatCount(post.viewCount)}</span></div><time className="post-date">{post.createdAt}</time></div></div><div className="post-divider" /><div className="post-writer"><ProtectedImage className="writer-profile-image" path={post.writerProfileImage} alt="작성자 프로필 이미지" /><span className="writer-nickname">{post.writerNickname}</span></div></div></button></article>)}</section>
    {hasNext && !loadMoreFailed && <div ref={loadMoreTarget} className="post-load-more-sentinel" aria-hidden="true" />}
    {loadingMore && <p className="post-load-more-status" role="status">게시글을 불러오는 중...</p>}
    {loadMoreFailed && <button type="button" className="create-post-button post-load-more-button" onClick={loadMore}>다시 불러오기</button>}
  </section></main><Toast toast={toast} /></>;
}
