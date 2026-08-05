import { useMemo, useState } from "react";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getFieldError, getStatusMessage } from "../api/errors";
import { ConfirmModal, ProtectedImage } from "./common";

export const MAX_INDENT_LEVEL = 3;

export function buildCommentTree(comments) {
  const nodes = new Map();
  const roots = [];

  (Array.isArray(comments) ? comments : []).forEach((comment) => {
    nodes.set(String(comment.commentId), { ...comment, children: [] });
  });

  nodes.forEach((comment) => {
    const parentId = comment.parentCommentId;
    const parent = parentId === null || parentId === undefined ? null : nodes.get(String(parentId));
    if (parent) parent.children.push(comment);
    else roots.push(comment);
  });

  return roots;
}

export function getReplyTargetNickname(parentComment) {
  if (parentComment.content === "삭제된 댓글" || parentComment.writerNickname === "탈퇴 회원") {
    return "탈퇴 회원";
  }
  return parentComment.writerNickname || "탈퇴 회원";
}

export function flattenVisibleComments(comments, expanded, indentLevel = 1, replyTargetNickname = null) {
  return comments.flatMap((comment) => {
    const current = [{ comment, indentLevel, replyTargetNickname }];
    if (!expanded[comment.commentId] || comment.children.length === 0) return current;

    return current.concat(flattenVisibleComments(
      comment.children,
      expanded,
      Math.min(indentLevel + 1, MAX_INDENT_LEVEL),
      getReplyTargetNickname(comment),
    ));
  });
}

function CommentMain({ comment, onUpdate, onDelete, showToast }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const deleted = comment.content === "삭제된 댓글";
  const owner = !deleted && comment.owner;

  async function update() {
    try {
      const response = await authFetch(`/posts/${comment.postId}/comment/${comment.commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        onUpdate(comment.commentId, body.data);
        setContent(body.data.content);
        setEditing(false);
      } else if (response.status === 400) {
        showToast(getFieldError(body, ["content"])?.message || ERROR_MESSAGES.request);
      } else showToast(getStatusMessage(response.status, { 403: "수정 권한이 없습니다.", 404: "해당 댓글을 찾을 수 없습니다." }));
    } catch {
      showToast(ERROR_MESSAGES.network);
    }
  }

  return <>
    <div className="comment-header-row">
      <div className="comment-body">
        <div className="comment-writer-meta">
          <ProtectedImage className="comment-writer-profile-image" path={comment.writerProfileImage} alt="댓글 작성자 프로필 이미지" />
          <span className="comment-writer-nickname">{comment.writerNickname}</span>
          <time className="comment-created-at">{comment.createdAt}</time>
          {comment.updatedAt && <span className="edited-label">수정됨</span>}
        </div>
        <p className="comment-content">{comment.content}</p>
      </div>
      {owner && <div className="comment-owner-actions">
        <button type="button" className="outline-action-button comment-edit-button" onClick={() => setEditing(true)}>수정</button>
        {editing && <button type="button" className="outline-action-button comment-edit-complete-button" onClick={update}>수정 완료</button>}
        <button type="button" className="outline-action-button comment-delete-button" onClick={() => onDelete(comment.commentId)}>삭제</button>
      </div>}
    </div>
    {editing && <textarea className="comment-edit-input" rows="3" value={content} onChange={(event) => setContent(event.target.value)} autoFocus />}
  </>;
}

function ReplyForm({ parentId, createComment }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  return <details className="reply-write-details" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="comment-submit-button reply-add-button">{open ? "댓글 취소" : "댓글 추가"}</summary>
    <form className="comment-form reply-comment-form" onSubmit={async (event) => {
      event.preventDefault();
      if (await createComment(parentId, content)) {
        setContent("");
        setOpen(false);
      }
    }}>
      <textarea className="comment-input" placeholder="댓글을 남겨주세요!" rows="5" value={content} onChange={(event) => setContent(event.target.value)} />
      <div className="comment-form-divider" />
      <div className="comment-submit-row"><button type="submit" className={`comment-submit-button ${content.trim() ? "active" : "disabled"}`} disabled={!content.trim()}>댓글 등록</button></div>
    </form>
  </details>;
}

function CommentItem({ comment, indentLevel, replyTargetNickname, expanded, setExpanded, createComment, updateComment, requestDelete, showToast }) {
  const hasChildren = comment.children.length > 0;
  const isExpanded = Boolean(expanded[comment.commentId]);
  const deleted = comment.content === "삭제된 댓글";

  return <article className={`comment-item${indentLevel > 1 ? " reply-item" : ""}`} data-indent-level={indentLevel}>
    <div className="comment-main">
      {replyTargetNickname && <div className="reply-context"><span className="reply-context-arrow" aria-hidden="true">↳</span><span>{replyTargetNickname}님에게 답장</span></div>}
      <CommentMain comment={comment} onUpdate={updateComment} onDelete={requestDelete} showToast={showToast} />
      {!deleted && <ReplyForm parentId={comment.commentId} createComment={createComment} />}
      {hasChildren && <button type="button" className="reply-toggle-button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => ({ ...current, [comment.commentId]: !current[comment.commentId] }))}>{isExpanded ? "접기" : "펼쳐보기"}</button>}
    </div>
  </article>;
}

export function CommentSection({ postId, comments, setComments, setCommentCount, showToast }) {
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const normalized = useMemo(() => (Array.isArray(comments) ? comments : []).map((comment) => ({ ...comment, postId })), [comments, postId]);
  const tree = useMemo(() => buildCommentTree(normalized), [normalized]);
  const visibleComments = useMemo(() => flattenVisibleComments(tree, expanded), [expanded, tree]);

  async function createComment(parentCommentId, text) {
    try {
      const response = await authFetch(`/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentCommentId, content: text }),
      });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        const created = body.data;
        setComments((current) => [created, ...(Array.isArray(current) ? current : [])]);
        if (body.data.commentCount !== undefined) setCommentCount(body.data.commentCount);
        if (parentCommentId !== null) setExpanded((current) => ({ ...current, [parentCommentId]: true }));
        return true;
      }
      if (response.status === 400) showToast(getFieldError(body, ["content"])?.message || ERROR_MESSAGES.request);
      else showToast(getStatusMessage(response.status, { 403: "작성 권한이 없습니다.", 404: "해당 댓글을 찾을 수 없습니다." }));
    } catch {
      showToast(ERROR_MESSAGES.network);
    }
    return false;
  }

  function updateComment(id, data) {
    setComments((current) => current.map((comment) => comment.commentId === id ? { ...comment, ...data } : comment));
  }

  async function removeComment() {
    try {
      const response = await authFetch(`/posts/${postId}/comment/${deleteId}`, { method: "DELETE" });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        setComments((current) => current.map((comment) => comment.commentId === deleteId
          ? { ...comment, content: "삭제된 댓글", owner: false, updatedAt: comment.updatedAt || new Date().toISOString() }
          : comment));
        if (body.data.commentCount !== undefined) setCommentCount(body.data.commentCount);
        setDeleteId(null);
      } else showToast(getStatusMessage(response.status, { 403: "삭제 권한이 없습니다.", 404: "해당 댓글을 찾을 수 없습니다." }));
    } catch {
      showToast(ERROR_MESSAGES.network);
    }
  }

  return <>
    <section className="comment-write-section" aria-label="댓글 작성">
      <form className="comment-form" onSubmit={async (event) => { event.preventDefault(); if (await createComment(null, content)) setContent(""); }}>
        <textarea className="comment-input" placeholder="댓글을 남겨주세요!" rows="5" value={content} onChange={(event) => setContent(event.target.value)} />
        <div className="comment-form-divider" />
        <div className="comment-submit-row"><button type="submit" className={`comment-submit-button ${content.trim() ? "active" : "disabled"}`} disabled={!content.trim()}>댓글 등록</button></div>
      </form>
    </section>
    <section className="comment-list-section" aria-label="댓글 목록">
      <div className="comment-list">{visibleComments.map(({ comment, indentLevel, replyTargetNickname }) => <CommentItem
        key={comment.commentId}
        comment={comment}
        indentLevel={indentLevel}
        replyTargetNickname={replyTargetNickname}
        expanded={expanded}
        setExpanded={setExpanded}
        createComment={createComment}
        updateComment={updateComment}
        requestDelete={setDeleteId}
        showToast={showToast}
      />)}</div>
    </section>
    <ConfirmModal isOpen={deleteId !== null} title="댓글을 삭제하시겠습니까?" description="삭제한 내용은 복구할 수 없습니다." confirmText="삭제" onCancel={() => setDeleteId(null)} onConfirm={removeComment} />
  </>;
}
