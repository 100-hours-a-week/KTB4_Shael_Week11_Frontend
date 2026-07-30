import {
    API_BASE_URL,
    setAccessToken,
} from "../common/auth.js";

const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const loginButton = document.querySelector("#loginButton");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const signupButton = document.querySelector("#signupButton");
const serverErrorToast = document.querySelector("#serverErrorToast");

emailInput.addEventListener("input", updateLoginButton);
passwordInput.addEventListener("input", updateLoginButton);

emailInput.addEventListener("blur", showEmailError);
passwordInput.addEventListener("blur", showPasswordError);

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            setAccessToken(data.data.token.accessToken);

            const currentUser = {
                userId: data.data.userId,
                email: data.data.email,
                nickname: data.data.nickname,
                profileImage: data.data.profileImage,
            };

            sessionStorage.setItem(
                "currentUser",
                JSON.stringify(currentUser)
            );
            location.href = "/posts/posts.html";
            return;
        }

        if (response.status === 400) {
            const errorInfo = getErrorMessage(data);
            showError(errorInfo.element, errorInfo.message);
        }
        else if (response.status === 401) {
            showError(loginError, "이메일 또는 비밀번호를 확인해주세요.");
        }
        else {
            showError(serverErrorToast, "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    } catch (error) {
        showError(serverErrorToast, "예기치 못한 서버 오류가 발생했습니다.");
    }
});

signupButton.addEventListener("click", () => {
    location.href = "/signup/signup.html"
});


function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");

    if (errorElement === serverErrorToast) {
        setTimeout(() => { serverErrorToast.classList.add("hidden"); }, 2000);
    }
}

function hideError() {
    loginError.classList.add("hidden");
}

function updateLoginButton() {
    const isEmailValid = checkEmail() === true;
    const isPasswordValid = checkPassword() === true;
    const isFormValid = isEmailValid && isPasswordValid;

    loginButton.disabled = !isFormValid;
    loginButton.classList.toggle("active", isFormValid);

    if (isFormValid) {
        hideError();
    }
}

function showEmailError() {
    const emailResult = checkEmail();

    if (emailResult !== true) {
        showError(loginError, emailResult);
    }
}

function showPasswordError() {
    const passwordResult = checkPassword();

    if (passwordResult !== true) {
        showError(loginError, passwordResult);
    }
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

function getErrorMessage(data) {
    const error = data.data?.errors?.[0];

    if (!error) {
        return {
            element: serverErrorToast,
            message: "요청 처리 중 오류가 발생했습니다.",
        }
    }
    if (error.field === "email" || error.field === "password") {
        return {
            element: loginError,
            message: error.code,
        }
    }
    return {
        element: serverErrorToast,
        message: "요청을 처리할 수 없습니다.",
    }
}
