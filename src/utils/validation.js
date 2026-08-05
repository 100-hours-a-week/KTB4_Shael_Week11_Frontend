export const validateEmail = (value) => {
  if (!value) return "이메일을 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)";
  if (value.length > 100) return "이메일 주소가 너무 깁니다.";
  return true;
};

export const validatePassword = (value) => {
  if (!value) return "비밀번호를 입력해주세요.";
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/.test(value)) return "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
  return true;
};

export const validatePasswordConfirm = (password, confirm, signup = false) => {
  if (!confirm) return signup ? "비밀번호 확인을 입력해주세요." : "비밀번호를 한번 더 입력해주세요.";
  if (password !== confirm) return signup ? "비밀번호가 다릅니다." : "비밀번호와 다릅니다.";
  return true;
};

export const validateNickname = (value) => {
  if (!value) return "닉네임을 입력해주세요.";
  if (/\s/.test(value)) return "띄어쓰기는 불가합니다.";
  if (value.length > 10) return "닉네임은 최대 10자까지 작성 가능합니다.";
  return true;
};

export const validateProfileImage = (file, required = false) => {
  if (required && !file) return "프로필 사진을 추가해주세요.";
  if (file?.name.length > 500) return "파일 이름은 최대 500자까지 가능합니다.";
  return true;
};

export const validateTitle = (value) => !value ? "제목을 입력해주세요." : value.length > 26 ? "제목은 최대 26자까지 작성 가능합니다." : true;
export const validateContent = (value) => value ? true : "내용을 입력해주세요.";
export const validatePostImages = (images) => {
  if (!images.length) return "이미지를 업로드해주세요.";
  if (images.length > 5) return "이미지는 최대 5장까지 업로드할 수 있습니다.";
  if (images.some((image) => (image.file || image)?.name?.length > 500)) return "파일 이름은 최대 500자까지 가능합니다.";
  return true;
};
