const serverErrorToast = document.querySelector("#serverErrorToast");
const postTitle = document.querySelector("#postTitle");
const postWriterProfileImage = document.querySelector("#postWriterProfileImage");
const postWriterNickname = document.querySelector("#postWriterNickname");
const postCreatedAt = document.querySelector("#postCreatedAt");
const postEditedLabel = document.querySelector("#postEditedLabel");
const postOwnerActions = document.querySelector("#postOwnerActions");
const editPostButton = document.querySelector("#editPostButton");
const deletePostButton = document.querySelector("#deletePostButton");

const postImageSlider = document.querySelector("#postImageSlider");
const prevImageButton = document.querySelector("#prevImageButton");
const postImage = document.querySelector("#postImage");
const nextImageButton = document.querySelector("#nextImageButton");
const imageCounter = document.querySelector("#imageCounter");
const postBody = document.querySelector("#postBody");
const likeButton = document.querySelector("#likeButton");

const likeCount = document.querySelector("#likeCount");
const viewCount = document.querySelector("#viewCount");
const commentCount = document.querySelector("#commentCount");

const deletePostModal = document.querySelector("#deletePostModal");
const cancelDeletePostButton = document.querySelector("#cancelDeletePostButton");
const confirmDeletePostButton = document.querySelector("#confirmDeletePostButton");

let userId = null;
let postId = null;
let postImages = [];
let currentImageIndex = 0;

export function renderPost(postData, pageContext) {
    userId = pageContext.userId;
    postId = pageContext.postId;
    postTitle.textContent = postData.title;
    postWriterProfileImage.src = postData.writerProfileImage;
    postWriterNickname.textContent = postData.writerNickname;
    postCreatedAt.textContent = postData.createdAt;
    postEditedLabel.classList.toggle("hidden", !postData.updatedAt);
    postOwnerActions.classList.toggle("hidden", !postData.owner);
    renderPostImages(postData.postImages || []);
    postBody.textContent = postData.content;
    likeCount.textContent = postData.likeCount;
    likeButton.classList.toggle("active", postData.liked);
    likeButton.classList.toggle("disabled", !postData.liked);
    viewCount.textContent = postData.viewCount;
    commentCount.textContent = postData.commentCount;
}

export function updateCommentCount(count) {
    commentCount.textContent = count;
}

editPostButton.addEventListener("click", () => {
    location.href = `/post-form/post-edit.html?postId=${postId}`;
})

deletePostButton.addEventListener("click", () => {
    deletePostModal.classList.remove("hidden");
})

cancelDeletePostButton.addEventListener("click", () => {
    deletePostModal.classList.add("hidden");
})

confirmDeletePostButton.addEventListener("click", async () => {
    try {
        const response = await fetch(`http://localhost:8080/${userId}/posts/${postId}`, {
            method: "DELETE"
        });

        if (response.status === 200) {
            location.href = "/posts/posts.html";
            return;
        }

        if (response.status === 401) {
            showError("로그인이 필요합니다.");
        }
        else if (response.status === 403) {
            showError("삭제 권한이 없습니다.");
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
});

function renderPostImages(images) {
    postImages = [...images].sort((a, b) => a.imageOrder - b.imageOrder);
    currentImageIndex = 0;
    if (postImages.length === 0) {
        showError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
    }
    updatePostImage();
}

function updatePostImage() {
    const currentImage = postImages[currentImageIndex];

    postImage.src = currentImage.postImage;
    postImage.alt = `게시글 이미지 ${currentImageIndex + 1}`;

    imageCounter.textContent = `${currentImageIndex + 1} / ${postImages.length}`;

    imageCounter.classList.toggle("hidden", postImages.length <= 1);
    prevImageButton.classList.toggle("hidden", currentImageIndex === 0);
    nextImageButton.classList.toggle("hidden", currentImageIndex === postImages.length - 1);
}

prevImageButton.addEventListener("click", () => {
    if (currentImageIndex === 0) {
        return;
    }
    currentImageIndex -= 1;
    updatePostImage();
});

nextImageButton.addEventListener("click", () => {
    if (currentImageIndex === postImages.length - 1) {
        return;
    }
    currentImageIndex += 1;
    updatePostImage();
});

likeButton.addEventListener("click", async () => {
    try {
        const response = await fetch(`http://localhost:8080/${userId}/posts/${postId}/like`, {
            method: "POST"
        });

        if (response.ok) {
            const data = await response.json();
            const liked = data.data.isLiked;

            likeButton.classList.toggle("active", liked);
            likeButton.classList.toggle("disabled", !liked);
            likeCount.textContent = data.data.likeCount;
            return;
        }

        if (response.status === 401) {
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
});

function showError(message) {
    serverErrorToast.textContent = message;
    serverErrorToast.classList.remove("hidden");
    setTimeout(() => { serverErrorToast.classList.add("hidden"); }, 2000);
}
