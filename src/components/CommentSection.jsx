import { useMemo, useState } from "react";
import { authFetch } from "../api/client";
import { ERROR_MESSAGES, getFieldError, getStatusMessage } from "../api/errors";
import { ConfirmModal, ProtectedImage } from "./common";

export const MAX_INDENT_LEVEL = 3;

export function isDeletedComment(comment) {
  return comment?.content === "삭제된 댓글";
}

export function isWithdrawnComment(comment) {
  return !isDeletedComment(comment) && comment?.writerNickname?.trim() === "탈퇴 회원";
}

function compareCommentsByCreatedAt(left, right) {
  const createdAtOrder = String(left.createdAt).localeCompare(String(right.createdAt));
  if (createdAtOrder !== 0) return createdAtOrder;
  return String(left.commentId).localeCompare(String(right.commentId), undefined, { numeric: true });
}

export function buildCommentDisplayMaps(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const deletedNumbers = new Map();
  const withdrawnNumbers = new Map();

  list.filter(isDeletedComment).sort(compareCommentsByCreatedAt).forEach((comment, index) => {
    deletedNumbers.set(String(comment.commentId), index + 1);
  });

  list.filter(isWithdrawnComment).sort(compareCommentsByCreatedAt).forEach((comment) => {
    const writerKey = String(comment.writerId);
    if (!withdrawnNumbers.has(writerKey)) withdrawnNumbers.set(writerKey, withdrawnNumbers.size + 1);
  });

  return { deletedNumbers, withdrawnNumbers };
}

export function getCommentPresentation(comment, displayMaps) {
  const deleted = isDeletedComment(comment);
  const withdrawn = isWithdrawnComment(comment);

  if (deleted) {
    const number = displayMaps.deletedNumbers.get(String(comment.commentId));
    return { deleted, withdrawn: false, author: `삭제된 댓글 ${number}`, content: "삭제된 댓글입니다." };
  }
  if (withdrawn) {
    const number = displayMaps.withdrawnNumbers.get(String(comment.writerId));
    return { deleted: false, withdrawn, author: `탈퇴 회원 ${number}`, content: comment.content };
  }
  return { deleted: false, withdrawn: false, author: comment.writerNickname, content: comment.content };
}

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

export function getReplyContextText(parentComment, displayMaps) {
  const presentation = getCommentPresentation(parentComment, displayMaps);
  if (presentation.deleted) return `${presentation.author}에 답장`;
  return `${presentation.author || "탈퇴 회원"}님에게 답장`;
}

export function flattenVisibleComments(comments, expanded, displayMaps, indentLevel = 1, replyContextText = null) {
  return comments.flatMap((comment) => {
    const current = [{ comment, indentLevel, replyContextText }];
    if (!expanded[comment.commentId] || comment.children.length === 0) return current;

    return current.concat(flattenVisibleComments(
      comment.children,
      expanded,
      displayMaps,
      Math.min(indentLevel + 1, MAX_INDENT_LEVEL),
      getReplyContextText(comment, displayMaps),
    ));
  });
}

function CommentMain({ comment, presentation, editing, onStartEditing, onCancelEditing, onUpdate, onDelete, showToast }) {
  const [content, setContent] = useState(comment.content);
  const { deleted, withdrawn } = presentation;
  const anonymous = deleted || withdrawn;
  const owner = !anonymous && comment.owner;

  function startEditing() {
    setContent(comment.content);
    onStartEditing();
  }

  function cancelEditing() {
    setContent(comment.content);
    onCancelEditing();
  }

  async function update(event) {
    event.preventDefault();
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
        onCancelEditing();
      } else if (response.status === 400) {
        showToast(getFieldError(body, ["content"])?.message || ERROR_MESSAGES.request);
      } else showToast(getStatusMessage(response.status, { 403: "수정 권한이 없습니다.", 404: "해당 댓글을 찾을 수 없습니다." }));
    } catch {
      showToast(ERROR_MESSAGES.network);
    }
  }

  return <>
    <div className="comment-header-row">
      <div className={`comment-body${anonymous ? " anonymous-comment" : ""}`}>
        <div className={`comment-writer-meta${anonymous ? " anonymous-comment-meta" : ""}`}>
          {!anonymous && <ProtectedImage className="comment-writer-profile-image" path={comment.writerProfileImage} alt="댓글 작성자 프로필 이미지" />}
          <span className="comment-writer-nickname">{presentation.author}</span>
          {!deleted && <time className="comment-created-at">{comment.createdAt}</time>}
          {!deleted && comment.updatedAt && <span className="edited-label">수정됨</span>}
        </div>
        {!editing && <p className="comment-content">{presentation.content}</p>}
      </div>
      {owner && !editing && <div className="comment-owner-actions">
        <button type="button" className="outline-action-button comment-edit-button" onClick={startEditing}>수정</button>
        <button type="button" className="outline-action-button comment-delete-button" onClick={() => onDelete(comment.commentId)}>삭제</button>
      </div>}
    </div>
    {editing && <form className="comment-form comment-edit-form" onSubmit={update}>
      <textarea className="comment-input" rows="5" value={content} onChange={(event) => setContent(event.target.value)} autoFocus />
      <div className="comment-form-divider" />
      <div className="comment-submit-row comment-edit-submit-row">
        <button type="button" className="comment-submit-button comment-edit-cancel-button" onClick={cancelEditing}>수정 취소</button>
        <button type="submit" className={`comment-submit-button ${content.trim() ? "active" : "disabled"}`} disabled={!content.trim()}>수정 완료</button>
      </div>
    </form>}
  </>;
}

function ReplyForm({ parentId, createComment, onClose }) {
  const [content, setContent] = useState("");

  return <form className="comment-form reply-comment-form" onSubmit={async (event) => {
      event.preventDefault();
      if (await createComment(parentId, content)) {
        setContent("");
        onClose();
      }
    }}>
      <textarea className="comment-input" placeholder="댓글을 남겨주세요!" rows="5" value={content} onChange={(event) => setContent(event.target.value)} />
      <div className="comment-form-divider" />
      <div className="comment-submit-row"><button type="submit" className={`comment-submit-button ${content.trim() ? "active" : "disabled"}`} disabled={!content.trim()}>댓글 등록</button></div>
    </form>;
}

function CommentItem({ comment, displayMaps, indentLevel, replyContextText, expanded, setExpanded, createComment, updateComment, requestDelete, showToast }) {
  const [editing, setEditing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const hasChildren = comment.children.length > 0;
  const isExpanded = Boolean(expanded[comment.commentId]);
  const presentation = getCommentPresentation(comment, displayMaps);
  const { deleted } = presentation;

  return <article className={`comment-item${indentLevel > 1 ? " reply-item" : ""}`} data-indent-level={indentLevel}>
    <div className="comment-main">
      {replyContextText && <div className="reply-context"><span className="reply-context-arrow" aria-hidden="true">↳</span><span>{replyContextText}</span></div>}
      <CommentMain
        comment={comment}
        presentation={presentation}
        editing={editing}
        onStartEditing={() => { setReplyOpen(false); setEditing(true); }}
        onCancelEditing={() => setEditing(false)}
        onUpdate={updateComment}
        onDelete={requestDelete}
        showToast={showToast}
      />
      {(hasChildren || (!deleted && !editing)) && <div className="comment-reply-actions">
        {hasChildren && <button type="button" className="reply-toggle-button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => ({ ...current, [comment.commentId]: !current[comment.commentId] }))}>{isExpanded ? "접기" : "펼쳐보기"}</button>}
        {!deleted && !editing && <button type="button" className="comment-submit-button reply-add-button" onClick={() => setReplyOpen((current) => !current)}>{replyOpen ? "댓글 취소" : "댓글 추가"}</button>}
      </div>}
      {replyOpen && !editing && <ReplyForm parentId={comment.commentId} createComment={createComment} onClose={() => setReplyOpen(false)} />}
    </div>
  </article>;
}

export function CommentSection({ postId, comments, setComments, setCommentCount, showToast }) {
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const normalized = useMemo(() => (Array.isArray(comments) ? comments : []).map((comment) => ({ ...comment, postId })), [comments, postId]);
  const displayMaps = useMemo(() => buildCommentDisplayMaps(normalized), [normalized]);
  const tree = useMemo(() => buildCommentTree(normalized), [normalized]);
  const visibleComments = useMemo(() => flattenVisibleComments(tree, expanded, displayMaps), [displayMaps, expanded, tree]);

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
        setComments((current) => [...(Array.isArray(current) ? current : []), created]);
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
      <div className="comment-list">{visibleComments.map(({ comment, indentLevel, replyContextText }) => <CommentItem
        key={comment.commentId}
        comment={comment}
        displayMaps={displayMaps}
        indentLevel={indentLevel}
        replyContextText={replyContextText}
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
