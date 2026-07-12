const headerProfileButton = document.querySelector("#headerProfileButton");
const headerProfileImage = document.querySelector("#headerProfileImage");
const profileDropdown = document.querySelector("#profileDropdown");
const editProfileButton = document.querySelector("#editProfileButton");
const editPasswordButton = document.querySelector("#editPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const createPostButton = document.querySelector("#createPostButton");
const postList = document.querySelector("#postList");
const serverErrorToast = document.querySelector("#serverErrorToast");


const savedUser = sessionStorage.getItem("currentUser");
if (!savedUser) {
  location.href = "/login/login.html";
}
const currentUser = JSON.parse(savedUser);

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

createPostButton.addEventListener("click", () => {
  location.href = "/post-form/post-create.html"
});

loadPosts();

async function loadPosts() {
  try {
    const response = await fetch(`http://localhost:8080/${userId}/posts`);

    if (response.ok) {
      const data = await response.json();

      renderPosts(data.data ?? []);
      return;
    }

    if (response.status === 401) {
      showError("로그인이 필요합니다.");
    }
    else {
      showError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  } catch (error) {
    showError("예기치 못한 서버 오류가 발생했습니다.");
  }
}

postList.addEventListener("click", (event) => {
  const postCard = event.target.closest(".post-card");

  if (!postCard) {
    return;
  }

  const postId = postCard.dataset.postId;

  location.href = `/post-detail/post-detail.html?postId=${postId}`;
});

function formatCount(count) {
  if (count >= 1000) {
    return `${Math.floor((count / 1000) * 10) / 10}k`;
  }
  return count;
}

function renderPosts(posts) {
  postList.innerHTML = "";

  posts.forEach((post) => {
    const displayTitle = post.title.length > 26 ? post.title.slice(0, 26) + "..." : post.title;
    postList.innerHTML += `
      <article class="post-card" data-post-id="${post.postId}">
        <button
          type="button"
          class="post-card-button"
        >
          <div class="post-content">
            <div class="post-main">
              <h3 class="post-title">
                ${displayTitle}
              </h3>

              <div class="post-info-row">
                <div class="post-stats">
                  <span>좋아요 ${formatCount(post.likeCount)}</span>
                  <span>댓글 ${formatCount(post.commentCount)}</span>
                  <span>조회수 ${formatCount(post.viewCount)}</span>
                </div>

                <time class="post-date">
                  ${post.createdAt}
                </time>
              </div>
            </div>

            <div class="post-divider"></div>

            <div class="post-writer">
              <img
                class="writer-profile-image"
                src="${post.writerProfileImage}"
                alt="작성자 프로필 이미지"
              />

              <span class="writer-nickname">
                ${post.writerNickname}
              </span>
            </div>
          </div>
        </button>
      </article>
    `;
  });
}

function showError(message) {
  serverErrorToast.textContent = message;
  serverErrorToast.classList.remove("hidden");
  setTimeout(() => { serverErrorToast.classList.add("hidden"); }, 2000);
}