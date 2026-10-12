export class AuthRequiredError extends Error {
  constructor() {
    super("저장·사진 기능을 이용하려면 ChatGPT로 로그인해주세요.");
    this.name = "AuthRequiredError";
  }
}
