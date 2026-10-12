import CharacterStudio from "./character-studio";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <CharacterStudio signedIn={Boolean(user)} signInLink={
    <a className="signin-link" href={chatGPTSignInPath("/")} target="_top">로그인으로 이동</a>
  } />;
}
