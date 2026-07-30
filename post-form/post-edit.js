import {
    API_BASE_URL,
    authFetch,
    hydrateProtectedImages,
    logout,
    requireCurrentUser,
    setProtectedImage,
} from "../common/auth.js";

const backButton = document.querySelector("#backButton");
const headerProfileButton = document.querySelector("#headerProfileButton");
const headerProfileImage = document.querySelector("#headerProfileImage");
const profileDropdown = document.querySelector("#profileDropdown");
const editProfileButton = document.querySelector("#editProfileButton");
const editPasswordButton = document.querySelector("#editPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const postEditForm = document.querySelector("#postEditForm");
const postTitleInput = document.querySelector("#postTitleInput");
const titleError = document.querySelector("#titleError");
const postContentInput = document.querySelector("#postContentInput");
const contentError = document.querySelector("#contentError");
const imageError = document.querySelector("#imageError");
const postImageInput = document.querySelector("#postImageInput");
const selectedFileText = document.querySelector("#selectedFileText");
const imagePreviewList = document.querySelector("#imagePreviewList");
const editCompleteButton = document.querySelector("#editCompleteButton");
const serverErrorToast = document.querySelector("#serverErrorToast");


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

let postImages = [];

loadPostInfo();

async function loadPostInfo() {
    try {
        const response = await authFetch(`/posts/${postId}`);

        if (response.ok) {
            const data = await response.json();
            const postData = data.data;

            postTitleInput.value = postData.title;
            postContentInput.value = postData.content;
            postImages = (postData.postImages ?? []).map((image) => {
                return {
                    type: "existing",
                    value: image.imageUrl,
                    originalFilename: image.originalFilename,
                };
            });

            renderImagePreviews();

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
postTitleInput.addEventListener("blur", showTitleError);
postContentInput.addEventListener("blur", showContentError);

postTitleInput.addEventListener("input", updateCompleteState);
postContentInput.addEventListener("input", updateCompleteState);

postImageInput.addEventListener("change", () => {
    const newFiles = Array.from(postImageInput.files);

    if (postImages.length + newFiles.length > 5) {
        showError(
            imageError,
            "이미지는 최대 5장까지 업로드할 수 있습니다."
        );

        postImageInput.value = "";
        return;
    }

    const hasTooLongFileName = newFiles.some(
        (file) => file.name.length > 500
    );

    if (hasTooLongFileName) {
        showError(
            imageError,
            "파일 이름은 최대 500자까지 가능합니다."
        );

        postImageInput.value = "";
        return;
    }

    newFiles.forEach((file) => {
        postImages.push({
            type: "new",
            file: file,
            value: file.name,
        });
    });

    postImageInput.value = "";

    renderImagePreviews();
    updateCompleteState();
    showImageError();
});

imagePreviewList.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".image-remove-button");

    if (!removeButton) {
        return;
    }
    const index = Number(removeButton.dataset.index);

    postImages.splice(index, 1);

    renderImagePreviews();
    updateCompleteState();
    showImageError();
});

function renderImagePreviews() {
    imagePreviewList.innerHTML = "";
    const imageCount = postImages.length;

    if (imageCount === 0) {
        selectedFileText.textContent = "파일을 선택해주세요.";
    }
    else if (imageCount === 1) {
        selectedFileText.textContent = postImages[0].value;
    }
    else {
        selectedFileText.textContent =
            `${postImages[0].value} 외 ${imageCount - 1}개`;
    }

    postImages.forEach((image, index) => {
        let imageUrl;
        let protectedImageSource = "";

        if (image.type === "existing") {
            imageUrl = "";
            protectedImageSource = `data-protected-src="${image.value}"`;
        } else {
            imageUrl = URL.createObjectURL(image.file);
        }

        imagePreviewList.insertAdjacentHTML(
            "beforeend",
            `
            <div class="image-preview-item">
                <img
                    class="image-preview"
                    src="${imageUrl}"
                    ${protectedImageSource}
                    alt="이미지 미리보기"
                >

                <button
                    type="button"
                    class="image-remove-button"
                    data-index="${index}"
                >
                    ×
                </button>
            </div>
            `
        );
    });

    hydrateProtectedImages(imagePreviewList);

    imagePreviewList.classList.toggle(
        "hidden",
        postImages.length === 0
    );
}

postEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = postTitleInput.value;
    const content = postContentInput.value;

    try {
        const formData = new FormData();
        formData.append(
            "content",
            new Blob(
                [JSON.stringify({ title, content })],
                { type: "application/json" }
            )
        );

        const imageFiles = await Promise.all(
            postImages.map(toMultipartImage)
        );
        imageFiles.forEach((file) => {
            formData.append("images", file);
        });

        const response = await authFetch(`/posts/${postId}`, {
            method: "PATCH",
            body: formData,
        });

        if (response.ok) {
            location.href = `/post-detail/post-detail.html?postId=${postId}`;

            return;
        }

        if (response.status === 400) {
            const data = await response.json();
            const errorInfo = getErrorMessage(data);
            showError(errorInfo.element, errorInfo.message);
        }
        else if (response.status === 401) {
            showError(serverErrorToast, "로그인이 필요합니다.");
        }
        else if (response.status === 403) {
            showError(serverErrorToast, "수정 권한이 없습니다.");
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
});

async function toMultipartImage(image) {
    if (image.type === "new") {
        return image.file;
    }

    const imageUrl = new URL(image.value, API_BASE_URL);
    const response = await authFetch(
        `${imageUrl.pathname}${imageUrl.search}`
    );

    if (!response.ok) {
        throw new Error("existing_image_fetch_failed");
    }

    const blob = await response.blob();
    const filename = image.originalFilename || decodeURIComponent(
        imageUrl.pathname.split("/").pop() || "post-image"
    );

    return new File([blob], filename, {
        type: blob.type || "application/octet-stream",
    });
}

function getErrorMessage(data) {
    const error = data.data?.errors?.[0];

    if (!error) {
        return {
            element: serverErrorToast,
            message: "요청 처리 중 오류가 발생했습니다.",
        }
    }

    if (error.field === "title") {
        return {
            element: titleError,
            message: error.code,
        }
    }
    else if (error.field === "content") {
        return {
            element: contentError,
            message: error.code,
        }
    }
    else if (error.field === "postImage") {
        return {
            element: imageError,
            message: error.code,
        }
    }

    return {
        element: serverErrorToast,
        message: "요청을 처리할 수 없습니다.",
    }
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");

    if (errorElement === serverErrorToast) {
        setTimeout(() => { serverErrorToast.classList.add("hidden"); }, 2000);
    }
}

function hideError(errorElement) {
    errorElement.classList.add("hidden");
}

function updateCompleteState() {
    const titleResult = checkTitle();
    const contentResult = checkContent();
    const postImageResult = checkPostImage();

    const isFormValid =
        titleResult === true &&
        contentResult === true &&
        postImageResult === true;

    editCompleteButton.disabled = !isFormValid;
    editCompleteButton.classList.toggle("active", isFormValid);
    editCompleteButton.classList.toggle("disabled", !isFormValid);
}

function showTitleError() {
    const result = checkTitle();

    if (result !== true) {
        showError(titleError, result);
    }
    else {
        hideError(titleError);
    }
}

function showContentError() {
    const result = checkContent();

    if (result !== true) {
        showError(contentError, result);
    }
    else {
        hideError(contentError);
    }
}

function showImageError() {
    const result = checkPostImage();

    if (result !== true) {
        showError(imageError, result);
    }
    else {
        hideError(imageError);
    }
}

function checkTitle() {
    if (postTitleInput.validity.valueMissing) {
        return "제목을 입력해주세요.";
    }
    if (postTitleInput.value.length > 26) {
        return "제목은 최대 26자까지 작성 가능합니다.";
    }

    return true;
}

function checkContent() {
    if (postContentInput.validity.valueMissing) {
        return "내용을 입력해주세요.";
    }

    return true;
}

function checkPostImage() {
    if (postImages.length === 0) {
        return "이미지를 업로드해주세요.";
    }

    if (postImages.length > 5) {
        return "이미지는 최대 5장까지 업로드할 수 있습니다.";
    }

    const hasTooLongFileName = postImages.some(
        (image) =>
            image.type === "new" &&
            image.file.name.length > 500
    );

    if (hasTooLongFileName) {
        return "파일 이름은 최대 500자까지 가능합니다.";
    }

    return true;
}
