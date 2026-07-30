import { API_BASE_URL } from "../common/auth.js";

const loginMoveButton = document.querySelector("#loginMoveButton");
const backButton = document.querySelector("#backButton");
const signupForm = document.querySelector("#signupForm");
const profileUploadButton = document.querySelector("#profileUploadButton");
const profilePreview = document.querySelector("#profilePreview");
const profileImageInput = document.querySelector("#profileImageInput");
const profileError = document.querySelector("#profileError");
const emailInput = document.querySelector("#emailInput");
const emailError = document.querySelector("#emailError");
const passwordInput = document.querySelector("#passwordInput");
const passwordError = document.querySelector("#passwordError");
const passwordConfirmInput = document.querySelector("#passwordConfirmInput");
const passwordConfirmError = document.querySelector("#passwordConfirmError");
const nicknameInput = document.querySelector("#nicknameInput");
const nicknameError = document.querySelector("#nicknameError");
const signupButton = document.querySelector("#signupButton");
const serverErrorToast = document.querySelector("#serverErrorToast");


emailInput.addEventListener("input", updateSignupState);
passwordInput.addEventListener("input", () => {
    updateSignupState();

    if (passwordConfirmInput.value !== "") {
        showPasswordConfirmError();
    }
});
passwordConfirmInput.addEventListener("input", updateSignupState);
nicknameInput.addEventListener("input", updateSignupState);

profileUploadButton.addEventListener("click", () => {
    profileImageInput.click();
});

profileImageInput.addEventListener("change", () => {
    const file = profileImageInput.files[0];

    if (file) {
        profilePreview.src = URL.createObjectURL(file);
        profilePreview.classList.remove("hidden");
    }

    updateSignupState();
});

emailInput.addEventListener("blur", showEmailError);
passwordInput.addEventListener("blur", showPasswordError);
passwordConfirmInput.addEventListener("blur", showPasswordConfirmError);
nicknameInput.addEventListener("blur", showNicknameError);

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profileImage = profileImageInput.files[0];
    const email = emailInput.value;
    const password = passwordInput.value;
    const nickname = nicknameInput.value;
    const formData = new FormData();

    formData.append(
        "content",
        new Blob(
            [JSON.stringify({ email, password, nickname })],
            { type: "application/json" }
        )
    );
    if (profileImage) {
        formData.append("profileImage", profileImage);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: "POST",
            credentials: "include",
            body: formData,
        });

        if (response.status === 201) {
            location.href = "/login/login.html"
            return;
        }

        const data = await response.json();

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

loginMoveButton.addEventListener("click", () => {
    location.href = "/login/login.html"
});

backButton.addEventListener("click", () => {
    location.href = "/login/login.html"
});


function getErrorMessage(data) {
    const error = data.data?.errors?.[0];

    if (!error) {
        return {
            element: serverErrorToast,
            message: "요청 처리 중 오류가 발생했습니다.",
        }
    }

    if (error.field === "email") {
        return {
            element: emailError,
            message: error.code,
        }
    }
    else if (error.field === "nickname") {
        return {
            element: nicknameError,
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

function updateSignupState() {
    const emailResult = checkEmail();
    const passwordResult = checkPassword();
    const passwordConfirmResult = checkPasswordConfirm();
    const nicknameResult = checkNickname();
    const profileImageResult = checkProfileImage();

    const isFormValid =
        emailResult === true &&
        passwordResult === true &&
        passwordConfirmResult === true &&
        nicknameResult === true &&
        profileImageResult === true;

    signupButton.disabled = !isFormValid;
    signupButton.classList.toggle("active", isFormValid);
    signupButton.classList.toggle("disabled", !isFormValid);
}

function showProfileImageError() {
    const result = checkProfileImage();

    if (result !== true) {
        showError(profileError, result);
    }
    else {
        hideError(profileError);
    }
}

function showEmailError() {
    const result = checkEmail();

    if (result !== true) {
        showError(emailError, result);
    }
    else {
        hideError(emailError);
    }
}

function showPasswordError() {
    const result = checkPassword();

    if (result !== true) {
        showError(passwordError, result);
    }
    else {
        hideError(passwordError);
    }
}

function showPasswordConfirmError() {
    const result = checkPasswordConfirm();

    if (result !== true) {
        showError(passwordConfirmError, result);
    }
    else {
        hideError(passwordConfirmError);
    }
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

function checkProfileImage() {
    if (profileImageInput.validity.valueMissing) {
        return "프로필 사진을 추가해주세요.";
    }

    const profileImageName = profileImageInput.files[0]?.name;

    if (profileImageName && profileImageName.length > 500) {
        return "파일 이름은 최대 500자까지 가능합니다.";
    }

    return true;
}

function checkEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailInput.validity.valueMissing) {
        return "이메일을 입력해주세요.";
    }
    if (!emailRegex.test(emailInput.value)) {
        return "올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)";
    }
    if (emailInput.value.length > 100) {
        return "이메일 주소가 너무 깁니다.";
    }

    return true;
}

function checkPassword() {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

    if (passwordInput.validity.valueMissing) {
        return "비밀번호를 입력해주세요.";
    }
    if (!passwordRegex.test(passwordInput.value)) {
        return "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    }

    return true;
}

function checkPasswordConfirm() {
    if (passwordConfirmInput.validity.valueMissing) {
        return "비밀번호 확인을 입력해주세요.";
    }
    if (passwordInput.value !== passwordConfirmInput.value) {
        return "비밀번호가 다릅니다.";
    }

    return true;
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
