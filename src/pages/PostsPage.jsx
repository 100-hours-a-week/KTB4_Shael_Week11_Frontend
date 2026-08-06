import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getStatusMessage } from "../api/errors";
import { Header, ProtectedImage, Toast } from "../components/common";
import { useToast } from "../hooks/useToast";
import { usePageStyle } from "../hooks/usePageStyle";
import postsCss from "../styles/posts.css?inline";
import iconCalendar from "../assets/icon-calendar.svg";
import iconComment from "../assets/icon-comment.svg";
import iconEye from "../assets/icon-eye.svg";
import iconHeart from "../assets/icon-heart.svg";
import iconSearch from "../assets/icon-search.svg";

const formatCount = (count) => count >= 1000 ? `${Math.floor((count / 1000) * 10) / 10}k` : count;
const formatListDate = (value) => String(value ?? "").slice(0, 10);

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

  return <><Header /><main className="posts-page"><section className="posts-container" aria-label="게시글 목록"><div className="posts-search"><input placeholder="게시글을 검색해보세요" aria-label="게시글 검색" /><img src={iconSearch} alt="" aria-hidden="true" /></div><div className="list-controls"><div className="sort-filter" role="group" aria-label="게시글 정렬"><button type="button" className="selected" aria-pressed="true">최신순</button><button type="button" aria-pressed="false">오래된 순</button><button type="button" aria-pressed="false">인기순</button></div><button type="button" className="create-post-button" onClick={() => navigate("/post-form/post-create.html")}>게시글 작성</button></div>
    <section className="post-list" aria-label="게시글 목록">{posts.map((post) => <article className="post-card" key={post.postId}><button type="button" className="post-card-button" onClick={() => navigate(`/post-detail/post-detail.html?postId=${post.postId}`)}><div className="post-content"><div className="post-card-head"><h3 className="post-title">{post.title.length > 26 ? `${post.title.slice(0, 26)}...` : post.title}</h3><time className="post-date"><img src={iconCalendar} alt="" aria-hidden="true" />{formatListDate(post.createdAt)}</time></div><div className="post-card-foot"><div className="post-stats"><span><img src={iconHeart} alt="" aria-hidden="true" />{formatCount(post.likeCount)}</span><span><img src={iconComment} alt="" aria-hidden="true" />{formatCount(post.commentCount)}</span><span><img src={iconEye} alt="" aria-hidden="true" />{formatCount(post.viewCount)}</span></div><div className="post-writer"><ProtectedImage className="writer-profile-image" path={post.writerProfileImage} alt="작성자 프로필 이미지" /><span className="writer-nickname">{post.writerNickname}</span></div></div></div></button></article>)}</section>
    {hasNext && !loadMoreFailed && <div ref={loadMoreTarget} className="post-load-more-sentinel" aria-hidden="true" />}
    {loadingMore && <p className="post-load-more-status" role="status">게시글을 불러오는 중...</p>}
    {loadMoreFailed && <button type="button" className="create-post-button post-load-more-button" onClick={loadMore}>다시 불러오기</button>}
  </section></main><Toast toast={toast} /></>;
}
