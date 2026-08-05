export const ERROR_MESSAGES = Object.freeze({
  request: "요청 처리 중 오류가 발생했습니다.",
  unauthorized: "로그인이 필요합니다.",
  server: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  network: "예기치 못한 서버 오류가 발생했습니다.",
});

export function getFieldError(body, allowedFields) {
  const error = body?.data?.errors?.[0];
  if (!error || !allowedFields.includes(error.field)) return null;
  return { field: error.field, message: error.code };
}

export function getStatusMessage(status, overrides = {}) {
  if (overrides[status]) return overrides[status];
  if (status === 400) return ERROR_MESSAGES.request;
  if (status === 401) return ERROR_MESSAGES.unauthorized;
  return ERROR_MESSAGES.server;
}
