const backButton = document.querySelector("#backButton");
const headerProfileButton = document.querySelector("#headerProfileButton");
const headerProfileImage = document.querySelector("#headerProfileImage");
const profileDropdown = document.querySelector("#profileDropdown");
const editProfileButton = document.querySelector("#editProfileButton");
const editPasswordButton = document.querySelector("#editPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const passwordEditForm = document.querySelector("#passwordEditForm");
const passwordInput = document.querySelector("#passwordInput");
const passwordError = document.querySelector("#passwordError");
const passwordConfirmInput = document.querySelector("#passwordConfirmInput");
const passwordConfirmError = document.querySelector("#passwordConfirmError");
const passwordEditSubmitButton = document.querySelector("#passwordEditSubmitButton");
const passwordEditToast = document.querySelector("#passwordEditToast");
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

passwordInput.addEventListener("input", () => {
    updateCompleteState();

    if (passwordConfirmInput.value !== "") {
        showPasswordConfirmError();
    }
});

passwordConfirmInput.addEventListener("input", () => {
    updateCompleteState();

    if (passwordConfirmInput.value !== "") {
        showPasswordConfirmError();
    }
});

passwordInput.addEventListener("blur", showPasswordError);
passwordConfirmInput.addEventListener("blur", showPasswordConfirmError);

passwordEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = passwordInput.value;

    try {
        const response = await fetch(`http://localhost:8080/user/${userId}/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                password: password,
            }),
        });

        if (response.ok) {
            showPasswordEditToast();
            passwordInput.value = "";
            passwordConfirmInput.value = "";

            passwordEditSubmitButton.disabled = true;
            passwordEditSubmitButton.classList.remove("active");
            passwordEditSubmitButton.classList.add("disabled");
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

function showPasswordEditToast() {
    passwordEditToast.classList.remove("hidden");

    setTimeout(() => {
        passwordEditToast.classList.add("hidden");
    }, 1000);
}

function getErrorMessage(data) {
    const error = data.data?.errors?.[0];

    if (!error) {
        return {
            element: serverErrorToast,
            message: "요청 처리 중 오류가 발생했습니다.",
        }
    }

    if (error.field === "password") {
        return {
            element: passwordError,
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
    const passwordResult = checkPassword();
    const passwordConfirmResult = checkPasswordConfirm();

    const isFormValid =
        passwordResult === true &&
        passwordConfirmResult === true;

    passwordEditSubmitButton.disabled = !isFormValid;
    passwordEditSubmitButton.classList.toggle("active", isFormValid);
    passwordEditSubmitButton.classList.toggle("disabled", !isFormValid);
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
        return "비밀번호를 한번 더 입력해주세요.";
    }
    if (passwordInput.value !== passwordConfirmInput.value) {
        return "비밀번호와 다릅니다."
    }

    return true;
}
