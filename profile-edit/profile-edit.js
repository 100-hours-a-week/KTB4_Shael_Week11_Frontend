import {
    authFetch,
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
const profileEditForm = document.querySelector("#profileEditForm");
const currentProfileImage = document.querySelector("#currentProfileImage");
const profileImageChangeButton = document.querySelector("#profileImageChangeButton");
const profileImageInput = document.querySelector("#profileImageInput");
const profileImageError = document.querySelector("#profileImageError");
const userEmailText = document.querySelector("#userEmailText");
const nicknameInput = document.querySelector("#nicknameInput");
const nicknameError = document.querySelector("#nicknameError");
const profileEditSubmitButton = document.querySelector("#profileEditSubmitButton");
const withdrawButton = document.querySelector("#withdrawButton");
const profileEditToast = document.querySelector("#profileEditToast");
const serverErrorToast = document.querySelector("#serverErrorToast");
const withdrawModalOverlay = document.querySelector("#withdrawModalOverlay");
const withdrawCancelButton = document.querySelector("#withdrawCancelButton");
const withdrawConfirmButton = document.querySelector("#withdrawConfirmButton");


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

loadUserInfo();

function loadUserInfo() {
    userEmailText.textContent = currentUser.email;
    nicknameInput.value = currentUser.nickname;
    setProtectedImage(currentProfileImage, currentUser.profileImage);
    return;
}

nicknameInput.addEventListener("blur", showNicknameError);
nicknameInput.addEventListener("input", updateCompleteState);

profileImageInput.addEventListener("change", () => {
    const file = profileImageInput.files[0];

    if (file) {
        currentProfileImage.src = URL.createObjectURL(file);
    }

    updateCompleteState();
    showProfileImageError();
});

profileEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nickname = nicknameInput.value;
    const profileImage = profileImageInput.files[0];
    const requestBody = {
        nickname: nickname,
    };
    const formData = new FormData();

    formData.append(
        "content",
        new Blob(
            [JSON.stringify(requestBody)],
            { type: "application/json" }
        )
    );
    if (profileImage) {
        formData.append("profileImage", profileImage);
    }

    try {
        const response = await authFetch("/user/info", {
            method: "PATCH",
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            showProfileEditToast();

            profileEditSubmitButton.disabled = true;
            profileEditSubmitButton.classList.remove("active");
            profileEditSubmitButton.classList.add("disabled");

            currentUser.email = data.data.email;
            currentUser.nickname = data.data.nickname;
            currentUser.profileImage = data.data.profileImage;
            sessionStorage.setItem(
                "currentUser", JSON.stringify(currentUser)
            );

            setProtectedImage(headerProfileImage, currentUser.profileImage);
            setProtectedImage(currentProfileImage, currentUser.profileImage);

            return;
        }

        const data = await response.json();

        if (response.status === 400) {
            const errorInfo = getErrorMessage(data);
            showError(errorInfo.element, errorInfo.message);
        }
        else if (response.status === 401) {
            showError(serverErrorToast, "로그인이 필요합니다.");
        }
        else {
            showError(serverErrorToast, "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    } catch (error) {
        showError(serverErrorToast, "예기치 못한 서버 오류가 발생했습니다.");
    }
});

function showProfileEditToast() {
    profileEditToast.classList.remove("hidden");

    setTimeout(() => {
        profileEditToast.classList.add("hidden");
    }, 1000);
}

withdrawButton.addEventListener("click", () => {
    withdrawModalOverlay.classList.remove("hidden");
})

withdrawCancelButton.addEventListener("click", () => {
    withdrawModalOverlay.classList.add("hidden");
})

withdrawConfirmButton.addEventListener("click", async () => {
    try {
        const response = await authFetch("/withdrawal", {
            method: "DELETE",
        });


        if (response.ok) {
            sessionStorage.removeItem("currentUser");

            profileEditToast.textContent = "탈퇴 완료";
            profileEditToast.classList.remove("hidden");

            setTimeout(() => {
                location.href = "/login/login.html";
            }, 1000);

            return;
        }

        const data = await response.json();

        if (response.status === 400) {
            const errorInfo = getErrorMessage(data);
            showError(errorInfo.element, errorInfo.message);
        }
        else if (response.status === 401) {
            showError(serverErrorToast, "로그인이 필요합니다.");
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

    if (error.field === "nickname") {
        return {
            element: nicknameError,
            message: error.code,
        }
    }
    else if (error.field === "profileImage") {
        return {
            element: profileImageError,
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
    const nicknameResult = checkNickname();
    const profileImageResult = checkProfileImage();

    const isFormValid =
        nicknameResult === true &&
        profileImageResult === true;

    profileEditSubmitButton.disabled = !isFormValid;
    profileEditSubmitButton.classList.toggle("active", isFormValid);
    profileEditSubmitButton.classList.toggle("disabled", !isFormValid);
}

function showNicknameError() {
    const result = checkNickname();

    if (result !== true) {
        showError(nicknameError, result);
    }
    else {
        hideError(nicknameError);
    }
}

function showProfileImageError() {
    const result = checkProfileImage();

    if (result !== true) {
        showError(profileImageError, result);
    }
    else {
        hideError(profileImageError);
    }
}

function checkNickname() {
    if (nicknameInput.validity.valueMissing) {
        return "닉네임을 입력해주세요.";
    }
    if (/\s/.test(nicknameInput.value)) {
        return "띄어쓰기는 불가합니다.";
    }
    if (nicknameInput.value.length > 10) {
        return "닉네임은 최대 10자까지 작성 가능합니다.";
    }

    return true;
}

function checkProfileImage() {
    const file = profileImageInput.files[0];

    if (!file) {
        return true;
    }

    if (file.name.length > 500) {
        return "파일 이름은 최대 500자까지 가능합니다.";
    }

    return true;
}
