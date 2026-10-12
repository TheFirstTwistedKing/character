# Rasyancut : Vanguard Character Maker — GitHub 업로드 안내

이 ZIP은 아래 사이트의 16번째 버전 원본 소스입니다.

- 원본 사이트: https://persona-character-studio.koroverkam.chatgpt.site
- 소스 버전: 16
- 소스 커밋: 0d5aeca3f01274ad33531f14d0e561ca73c88bc3
- 내보낸 날짜: 2026-10-12

## GitHub에 올리기

1. ZIP을 압축 해제합니다.
2. GitHub에서 새 저장소를 만들거나 사용할 저장소를 엽니다.
3. `persona-character-studio` 폴더 **안의 파일과 폴더**를 저장소 최상위에 업로드합니다.
4. 최상위에 `package.json`, `app/`, `public/`, `vite.config.ts`가 있는지 확인합니다.
5. 숨김 파일인 `.gitignore`, `.npmrc`, `.openai/hosting.json`도 포함합니다. `.openai/hosting.json`은 현재 설정 파일에서 가져오므로 필요합니다.

ZIP 파일 자체만 저장소에 올리면 소스가 자동으로 풀리거나 사이트가 실행되지는 않습니다. 숨김 파일을 포함하기 쉬운 방법은 GitHub Desktop 또는 Git으로 압축 해제한 폴더를 커밋하는 것입니다.

## 프로젝트 구성

- `app/`, `components/`, `lib/`: 화면과 캐릭터 제작 기능
- `public/`: 로고, 이미지, 폰트 및 폰트 라이선스
- `app/api/`: 캐릭터 슬롯과 사진 API
- `db/`, `drizzle/`: 데이터베이스 정의와 마이그레이션
- `worker/`, `vite.config.ts`, `build/`: Vinext 및 Cloudflare Worker 구성
- `tests/`: 원본 프로젝트의 테스트
- `package.json`, `package-lock.json`: 실행 명령과 고정된 의존성
- `README.md`: 원본 프로젝트의 기술 안내

## 실행 환경

원본은 React 기반의 Vinext 프로젝트이며 Cloudflare Workers, D1, R2와 ChatGPT Sites 인증을 사용합니다. 단순 HTML 사이트가 아닙니다.

원본 명령은 Node.js 22.13.0 이상과 Linux 도구 `bash`, `flock`, `curl`, GNU `timeout`을 전제로 합니다. Windows에서는 WSL 같은 Linux 환경이 필요합니다.

Linux 환경에서 프로젝트 폴더로 이동한 뒤:

```bash
npm run install:ci
npm run dev
```

빌드 명령:

```bash
npm run build
```

로컬 미리보기에는 원본 Sites의 인증 서비스가 없으므로 로그인과 사용자별 저장 기능은 별도 인증 연결 전까지 작동하지 않습니다.

## 다른 호스팅으로 옮길 때

GitHub 저장소에 소스를 보관하고 수정하는 용도로 바로 사용할 수 있습니다. **GitHub Pages에서 사이트를 실행할 수 있도록 변환한 버전은 아닙니다.**

현재 코드는 서버에서 사용자 인증 헤더를 읽고, 저장·사진 API에서 Cloudflare D1/R2를 사용합니다. 다른 서버에 배포하려면 실제 데이터베이스·버킷 설정과 인증 구현이 필요합니다. 원본의 ChatGPT 로그인 경로(`/signin-with-chatgpt`, `/signout-with-chatgpt`)는 Sites 서비스가 제공하므로 소스만 복사해서 다른 호스트로 옮길 수 없습니다.

GitHub Pages로 사용하려면 정적 화면으로 변환하고, 로그인·슬롯 저장·사진 업로드 기능을 브라우저 저장 방식이나 별도 API에 연결하는 추가 작업이 필요합니다.

## 포함 범위와 확인

원본 소스, 정적 이미지와 폰트, 데이터베이스 마이그레이션을 포함했습니다. 실제 서비스에 저장된 캐릭터·업로드 사진·사용자 데이터는 포함되지 않습니다.

Git 이력, 인증 토큰, `node_modules`, 실행 중 생성되는 파일은 포함하지 않았습니다. 원본에 추적되어 있던 TypeScript 빌드 캐시(`tsconfig.tsbuildinfo`)도 제외했습니다. 이 안내 외에 애플리케이션 코드는 변경하지 않았습니다.

소스 커밋 일치, 포함 파일의 원본 일치, ZIP 무결성을 확인했습니다. 이번 작업은 소스 내보내기이며 새 실행 환경의 의존성 설치·빌드·배포는 수행하지 않았습니다.
