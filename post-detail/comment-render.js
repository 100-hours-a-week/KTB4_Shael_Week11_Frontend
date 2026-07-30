import { updateCommentCount } from "./post-render.js";
import {
    authFetch,
    hydrateProtectedImages,
} from "../common/auth.js";

const commentForm = document.querySelector("#commentForm");
const commentInput = document.querySelector("#commentInput");
const commentSubmitButton = document.querySelector("#commentSubmitButton");
const commentList = document.querySelector("#commentList");
const serverErrorToast = document.querySelector("#serverErrorToast");
const deleteCommentModal = document.querySelector("#deleteCommentModal");
const cancelDeleteCommentButton = document.querySelector("#cancelDeleteCommentButton");
const confirmDeleteCommentButton = document.querySelector("#confirmDeleteCommentButton");

let postId = null;
let selectedCommentId = null;
let selectedCommentItem = null;

export function renderComments(data, pageContext) {
    postId = pageContext.postId;

    const comments = Array.isArray(data) ? data : [];

    commentList.innerHTML = "";

    comments
        .filter((comment) => !hasParentComment(comment))
        .forEach((comment) => {
            const replies = comments.filter((reply) => {
                return String(reply.parentCommentId) === String(comment.commentId);
            });

            commentList.innerHTML += renderParentComment(comment, replies);
        });

    hydrateProtectedImages(commentList);
}

function renderParentComment(comment, replies = []) {
    return `
        <article class="comment-item" data-comment-id="${comment.commentId}" data-depth="0">
            <div class="comment-main">
                ${renderCommentMain(comment)}

                ${renderReplyWriteForm(comment.commentId)}

                ${renderReplyToggleButton(comment, replies)}
            </div>

            ${renderReplyList(comment, replies)}
        </article>
    `;
}

function hasParentComment(comment) {
    return comment.parentCommentId !== null && comment.parentCommentId !== undefined;
}

function renderCommentMain(comment) {
    const ownerClass = comment.isOwner || comment.owner ? "" : "hidden";
    const editedClass = comment.updatedAt ? "" : "hidden";
    const profileImage = comment.writerProfileImage;

    return `
        <div class="comment-header-row">
            <div class="comment-body">
                <div class="comment-writer-meta">
                    <img class="comment-writer-profile-image" data-protected-src="${profileImage}"
                        alt="댓글 작성자 프로필 이미지" data-comment-field="writerProfileImage" />

                    <span class="comment-writer-nickname" data-comment-field="writerNickname">
                        ${comment.writerNickname}
                    </span>

                    <time class="comment-created-at" datetime="${comment.createdAt}"
                        data-comment-field="createdAt">
                        ${comment.createdAt}
                    </time>

                    <span class="edited-label ${editedClass}" data-comment-field="commentEditedLabel">
                        수정됨
                    </span>
                </div>

                <p class="comment-content" data-comment-field="content">${comment.content}</p>
            </div>

            <div class="comment-owner-actions ${ownerClass}" data-visible-for="comment-owner">
                <button type="button" class="outline-action-button comment-edit-button" data-action="edit-comment"
                    data-comment-id="${comment.commentId}">
                    수정
                </button>

                <button type="button" class="outline-action-button comment-edit-complete-button"
                    data-action="complete-edit-comment" data-comment-id="${comment.commentId}">
                    수정 완료
                </button>

                <button type="button" class="outline-action-button comment-delete-button"
                    data-action="open-delete-comment-modal" data-modal-target="deleteCommentModal"
                    data-comment-id="${comment.commentId}">
                    삭제
                </button>
            </div>
        </div>

        <textarea class="comment-edit-input" name="commentEdit" data-input="edit-comment"
            rows="3">${comment.content}</textarea>
    `;
}

function renderReplyWriteForm(parentCommentId) {
    return `
        <details class="reply-write-details">
            <summary class="comment-submit-button reply-add-button">
                댓글 추가
            </summary>

            <form class="comment-form reply-comment-form" data-form="reply-comment"
                data-parent-comment-id="${parentCommentId}">
                <textarea class="comment-input" name="replyComment" placeholder="댓글을 남겨주세요!"
                    data-input="reply-comment" rows="5"></textarea>

                <div class="comment-form-divider"></div>

                <div class="comment-submit-row">
                    <button type="submit" class="comment-submit-button disabled"
                        data-action="submit-reply-comment" data-parent-comment-id="${parentCommentId}"
                        disabled>
                        댓글 등록
                    </button>
                </div>
            </form>
        </details>
    `;
}

function renderReplyToggleButton(comment, replies) {
    if (replies.length === 0) {
        return "";
    }

    return `
        <button type="button" class="reply-toggle-button" data-action="toggle-replies"
            data-comment-id="${comment.commentId}" aria-expanded="false">
            펼쳐보기
        </button>
    `;
}

function renderReplyList(comment, replies) {
    if (replies.length === 0) {
        return "";
    }

    return `
        <div class="reply-list hidden" data-list="replies" data-parent-comment-id="${comment.commentId}">
            ${replies.map((reply) => renderReplyItem(reply)).join("")}
        </div>
    `;
}

function renderReplyItem(reply) {
    return `
        <article class="comment-item reply-item" data-comment-id="${reply.commentId}" data-depth="1">
            <div class="comment-main">
                ${renderCommentMain(reply)}
            </div>
        </article>
    `;
}

function addCreatedComment(comment) {
    if (!hasParentComment(comment)) {
        commentList.insertAdjacentHTML("afterbegin", renderParentComment(comment));
        hydrateProtectedImages(commentList);
        return;
    }

    const parentComment = commentList.querySelector(`.comment-item[data-comment-id="${comment.parentCommentId}"]`);

    if (!parentComment) {
        return;
    }

    const commentMain = parentComment.querySelector(".comment-main");
    let replyList = parentComment.querySelector(`.reply-list[data-parent-comment-id="${comment.parentCommentId}"]`);
    let replyToggleButton = commentMain.querySelector(".reply-toggle-button");

    if (!replyList) {
        parentComment.insertAdjacentHTML("beforeend", `
            <div class="reply-list" data-list="replies" data-parent-comment-id="${comment.parentCommentId}"></div>
        `);
        replyList = parentComment.querySelector(`.reply-list[data-parent-comment-id="${comment.parentCommentId}"]`);
    }

    if (!replyToggleButton) {
        commentMain.insertAdjacentHTML("beforeend", renderReplyToggleButton({ commentId: comment.parentCommentId }, [comment]));
        replyToggleButton = commentMain.querySelector(".reply-toggle-button");
    }

    replyList.classList.remove("hidden");
    replyToggleButton.setAttribute("aria-expanded", "true");
    replyToggleButton.textContent = "접기";
    replyList.insertAdjacentHTML("afterbegin", renderReplyItem(comment));
    hydrateProtectedImages(replyList);
}

function getCreatedComment(responseData) {
    return responseData.data.comment || responseData.data.createdComment || responseData.data;
}

function getCommentCount(responseData) {
    return responseData.data.commentCount;
}

function resetCommentForm(input, submitButton) {
    input.value = "";
    submitButton.disabled = true;
    submitButton.classList.remove("active");
    submitButton.classList.add("disabled");
}

commentInput.addEventListener("input", () => {
    const hasContent = commentInput.value.trim().length > 0;

    commentSubmitButton.disabled = !hasContent;
    commentSubmitButton.classList.toggle("active", hasContent);
    commentSubmitButton.classList.toggle("disabled", !hasContent);
});

commentList.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-action='edit-comment']");

    if (editButton) {
        const commentItem = editButton.closest(".comment-item");
        const editInput = commentItem.querySelector(".comment-edit-input");

        commentItem.classList.add("editing");
        editInput?.focus();
        return;
    }

    const replyToggleButton = event.target.closest("[data-action='toggle-replies']");

    if (replyToggleButton) {
        const parentCommentId = replyToggleButton.dataset.commentId;
        const replyList = commentList.querySelector(`.reply-list[data-parent-comment-id="${parentCommentId}"]`);

        if (!replyList) {
            return;
        }

        const isHidden = replyList.classList.toggle("hidden");

        replyToggleButton.setAttribute("aria-expanded", String(!isHidden));
        replyToggleButton.textContent = isHidden ? "펼쳐보기" : "접기";
        return;
    }

    const completeEditButton = event.target.closest("[data-action='complete-edit-comment']");

    if (completeEditButton) {
        const commentItem = completeEditButton.closest(".comment-item");
        const commentId = completeEditButton.dataset.commentId;
        const editInput = commentItem.querySelector(".comment-edit-input");
        const content = editInput.value;

        try {
            const response = await authFetch(`/posts/${postId}/comment/${commentId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: content,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const commentContent = commentItem.querySelector(".comment-content");
                const editedLabel = commentItem.querySelector(".edited-label");

                commentContent.textContent = data.data.content;
                editInput.value = data.data.content;
                editedLabel.classList.toggle("hidden", !data.data.updatedAt);
                commentItem.classList.remove("editing");
                return;
            }

            if (response.status === 400) {
                showError(getErrorMessage(data));
            }
            else if (response.status === 401) {
                showError("로그인이 필요합니다.");
            }
            else if (response.status === 403) {
                showError("수정 권한이 없습니다.");
            }
            else if (response.status === 404) {
                showError("해당 댓글을 찾을 수 없습니다.");
            }
            else {
                showError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            }
        } catch (error) {
            showError("예기치 못한 서버 오류가 발생했습니다.");
        }
        return;
    }

    const deleteButton = event.target.closest("[data-action='open-delete-comment-modal']");

    if (!deleteButton) {
        return;
    }

    selectedCommentId = deleteButton.dataset.commentId;
    selectedCommentItem = deleteButton.closest(".comment-item");
    deleteCommentModal.classList.remove("hidden");
});

commentList.addEventListener("input", (event) => {
    const replyInput = event.target.closest("[data-input='reply-comment']");

    if (!replyInput) {
        return;
    }

    const replyForm = replyInput.closest("[data-form='reply-comment']");
    const replySubmitButton = replyForm.querySelector("[data-action='submit-reply-comment']");
    const hasContent = replyInput.value.trim().length > 0;

    replySubmitButton.disabled = !hasContent;
    replySubmitButton.classList.toggle("active", hasContent);
    replySubmitButton.classList.toggle("disabled", !hasContent);
});

commentList.addEventListener("submit", async (event) => {
    const replyForm = event.target.closest("[data-form='reply-comment']");

    if (!replyForm) {
        return;
    }

    event.preventDefault();

    const parentCommentId = replyForm.dataset.parentCommentId;
    const replyInput = replyForm.querySelector("[data-input='reply-comment']");
    const replySubmitButton = replyForm.querySelector("[data-action='submit-reply-comment']");
    const content = replyInput.value;

    await createComment(parentCommentId, content, replyInput, replySubmitButton);
});

commentList.addEventListener("toggle", (event) => {
    const replyWriteDetails = event.target.closest(".reply-write-details");

    if (!replyWriteDetails) {
        return;
    }

    const replyAddButton = replyWriteDetails.querySelector(".reply-add-button");
    replyAddButton.textContent = replyWriteDetails.open ? "댓글 취소" : "댓글 추가";
}, true);

cancelDeleteCommentButton.addEventListener("click", () => {
    selectedCommentId = null;
    selectedCommentItem = null;
    deleteCommentModal.classList.add("hidden");
});

confirmDeleteCommentButton.addEventListener("click", async () => {
    if (!selectedCommentId) {
        return;
    }

    try {
        const response = await authFetch(`/posts/${postId}/comment/${selectedCommentId}`, {
            method: "DELETE",
        });

        if (response.status === 200) {
            const data = await response.json();
            const replyList = selectedCommentItem?.closest(".reply-list");

            selectedCommentItem?.remove();
            updateCommentCount(data.data.commentCount);
            removeEmptyReplyList(replyList);

            selectedCommentId = null;
            selectedCommentItem = null;
            deleteCommentModal.classList.add("hidden");
            return;
        }

        if (response.status === 401) {
            showError("로그인이 필요합니다.");
        }
        else if (response.status === 403) {
            showError("삭제 권한이 없습니다.");
        }
        else if (response.status === 404) {
            showError("해당 댓글을 찾을 수 없습니다.");
        }
        else {
            showError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    } catch (error) {
        showError("예기치 못한 서버 오류가 발생했습니다.");
    }
});

function removeEmptyReplyList(replyList) {
    if (!replyList || replyList.querySelector(".reply-item")) {
        return;
    }

    const parentCommentId = replyList.dataset.parentCommentId;
    const parentComment = commentList.querySelector(`.comment-item[data-comment-id="${parentCommentId}"]`);
    const replyToggleButton = parentComment?.querySelector(".reply-toggle-button");

    replyToggleButton?.remove();
    replyList.remove();
}

commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const parentCommentId = null;
    const content = commentInput.value;

    await createComment(parentCommentId, content, commentInput, commentSubmitButton);
})

async function createComment(parentCommentId, content, input, submitButton) {
    try {
        const response = await authFetch(`/posts/${postId}/comment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                parentCommentId: parentCommentId,
                content: content,
            }),
        });


        const data = await response.json();

        if (response.ok) {
            const createdComment = getCreatedComment(data);
            const commentCount = getCommentCount(data);

            addCreatedComment(createdComment);

            if (commentCount !== undefined) {
                updateCommentCount(commentCount);
            }

            resetCommentForm(input, submitButton);
            return;
        }

        if (response.status === 400) {
            showError(getErrorMessage(data));
        }
        else if (response.status === 401) {
            showError("로그인이 필요합니다.");
        }
        else if (response.status === 403) {
            showError("본인 게시글에는 좋아요를 누를 수 없습니다.");
        }
        else if (response.status === 404) {
            showError("해당 게시글을 찾을 수 없습니다.");
        }
        else {
            showError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    } catch (error) {
        showError("예기치 못한 서버 오류가 발생했습니다.");
    }
}

function getErrorMessage(data) {
    const error = data.data?.errors?.[0];

    if (!error) {
        return "요청 처리 중 오류가 발생했습니다.";
    }

    if (error.field === "content") {
        return error.code;
    }

    return "요청을 처리할 수 없습니다.";
}

function showError(message) {
    serverErrorToast.textContent = message;
    serverErrorToast.classList.remove("hidden");
    setTimeout(() => { serverErrorToast.classList.add("hidden"); }, 2000);
}
