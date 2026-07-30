const backButton = document.querySelector("#backButton");
const headerProfileButton = document.querySelector("#headerProfileButton");
const headerProfileImage = document.querySelector("#headerProfileImage");
const profileDropdown = document.querySelector("#profileDropdown");
const editProfileButton = document.querySelector("#editProfileButton");
const editPasswordButton = document.querySelector("#editPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const serverErrorToast = document.querySelector("#serverErrorToast");

import { renderPost } from "./post-render.js";
import { renderComments } from "./comment-render.js";
import {
    authFetch,
    logout,
    requireCurrentUser,
    setProtectedImage,
} from "../common/auth.js";

const currentUser = await requireCurrentUser();

backButton.addEventListener("click", () => {
    location.href = "/posts/posts.html"
});

headerProfileButton.addEventListener("click", () => {
    profileDropdown.classList.toggle("hidden");
});

editProfileButton.addEventListener("click", () => {
    location.href = "/profile-edit/profile-edit.html"
});

editPasswordButton.addEventListener("click", () => {
    location.href = "/password-edit/password-edit.html"
});

logoutButton.addEventListener("click", async () => {
    await logout();
    location.href = "/login/login.html"
});

setProtectedImage(headerProfileImage, currentUser.profileImage);

const params = new URLSearchParams(location.search);
const postId = params.get("postId");

loadPostDetail();

async function loadPostDetail() {
    try {
        const response = await authFetch(`/posts/${postId}`);

        if (response.ok) {
            const data = await response.json();

            const {
                commentList = [],
                ...postData
            } = data.data;

            renderPost(postData, {
                postId,
            });
            renderComments(commentList, {
                postId,
            });

            return;
        }

        if (response.status === 401) {
            showError(serverErrorToast, "로그인이 필요합니다.");
        }
        else if (response.status === 404) {
            showError(serverErrorToast, "해당 게시글을 찾을 수 없습니다.");
        }
        else {
            showError(serverErrorToast, "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    } catch (error) {
        showError(serverErrorToast, "예기치 못한 서버 오류가 발생했습니다.");
    }
}

function showError(message) {
    serverErrorToast.textContent = message;
    serverErrorToast.classList.remove("hidden");
    setTimeout(() => { serverErrorToast.classList.add("hidden"); }, 2000);
}
