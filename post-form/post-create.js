const backButton = document.querySelector("#backButton");
const headerProfileButton = document.querySelector("#headerProfileButton");
const headerProfileImage = document.querySelector("#headerProfileImage");
const profileDropdown = document.querySelector("#profileDropdown");
const editProfileButton = document.querySelector("#editProfileButton");
const editPasswordButton = document.querySelector("#editPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const postCreateForm = document.querySelector("#postCreateForm");
const postTitleInput = document.querySelector("#postTitleInput");
const titleError = document.querySelector("#titleError");
const postContentInput = document.querySelector("#postContentInput");
const contentError = document.querySelector("#contentError");
const imageError = document.querySelector("#imageError");
const postImageInput = document.querySelector("#postImageInput");
const selectedFileText = document.querySelector("#selectedFileText");
const imagePreviewList = document.querySelector("#imagePreviewList");
const completeButton = document.querySelector("#completeButton");
const serverErrorToast = document.querySelector("#serverErrorToast");


const savedUser = sessionStorage.getItem("currentUser");
if (!savedUser) {
    location.href = "/login/login.html";
}
const currentUser = JSON.parse(savedUser);

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

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    location.href = "/login/login.html"
});

const userId = currentUser.userId;
headerProfileImage.src = currentUser.profileImage;

postTitleInput.addEventListener("input", updateCompleteState);
postContentInput.addEventListener("input", updateCompleteState);

let selectedFiles = [];

postImageInput.addEventListener("change", () => {
    const newFiles = Array.from(postImageInput.files);

    const combinedFiles = [
        ...selectedFiles,
        ...newFiles
    ];

    if (combinedFiles.length > 5) {
        showError(imageError, "이미지는 최대 5장까지 업로드할 수 있습니다.");
        postImageInput.value = "";
        return;
    }

    selectedFiles = combinedFiles;
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

    selectedFiles.splice(index, 1);

    renderImagePreviews();
    updateCompleteState();
});

function renderImagePreviews() {
    imagePreviewList.innerHTML = "";

    const selectedFileCount = selectedFiles.length;
    if (selectedFileCount > 1) {
        selectedFileText.textContent = `${selectedFiles[0].name} 외 ${selectedFileCount - 1}개`;
    }
    else if (selectedFileCount === 1) {
        selectedFileText.textContent = selectedFiles[0].name;
    }
    else {
        selectedFileText.textContent = "파일을 선택해주세요.";
    }

    selectedFiles.forEach((file, index) => {
        const imageUrl = URL.createObjectURL(file);

        imagePreviewList.insertAdjacentHTML(
            "beforeend",
            `
            <div class="image-preview-item">
                <img
                    class="image-preview"
                    src="${imageUrl}"
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

    imagePreviewList.classList.toggle(
        "hidden",
        selectedFiles.length === 0
    );
}

postTitleInput.addEventListener("blur", showTitleError);
postContentInput.addEventListener("blur", showContentError);

postCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = postTitleInput.value;
    const content = postContentInput.value;
    const postImage = selectedFiles
        .map((file) => file.name);

    try {
        const response = await fetch(`http://localhost:8080/${userId}/posts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: title,
                content: content,
                postImage: postImage,
            }),
        });

        const data = await response.json();

        if (response.status === 201) {
            const postId = data.data.postId;
            location.href = `/post-detail/post-detail.html?userId=${userId}&postId=${postId}`
            return;
        }

        if (response.status === 400) {
            const errorInfo = getErrorMessage(data);
            showError(errorInfo.element, errorInfo.message);
        }
        else {
            showError(serverErrorToast, "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    } catch (error) {
        showError(serverErrorToast, "예기치 못한 서버 오류가 발생했습니다.");
    }
});


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
    const imageResult = checkImage();

    const isFormValid =
        titleResult === true &&
        contentResult === true &&
        imageResult === true;

    completeButton.disabled = !isFormValid;
    completeButton.classList.toggle("active", isFormValid);
    completeButton.classList.toggle("disabled", !isFormValid);
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
    const result = checkImage();

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

function checkImage() {
    const files = selectedFiles;

    if (files.length === 0) {
        return "이미지를 업로드해주세요.";
    }
    if (files.length > 5) {
        return "이미지는 최대 5장까지 업로드할 수 있습니다.";
    }
    const hasTooLongImageName = files.some((file) => file.name.length > 500);

    if (hasTooLongImageName) {
        return "파일 이름은 최대 500자까지 가능합니다.";
    }

    return true;
}