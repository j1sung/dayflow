# dayflow
스케줄 관리 웹앱

## 기본 저장소

DayFlow 웹앱의 소스 코드와 설계 문서는 https://github.com/j1sung/dayflow 에서 관리합니다.
앞선 MVP 설계의 권장 스택은 Next.js + Supabase(PostgreSQL)이며, Google Calendar API와 Trello API를 연동합니다. 현재 저장소에는 아직 앱 코드가 없습니다.

## 비밀정보 관리

- API 키, OAuth client secret, 접근·갱신 토큰은 로컬 `.env` 또는 `.env.local`에 보관합니다.
- 서비스 계정 JSON과 기타 인증 파일은 `secrets/`, `.secrets/`, `credentials/` 또는 `.credentials/`에 보관합니다. 외부에서 받은 인증 파일은 이름을 임의로 바꾸어 소스 폴더에 두지 않습니다.
- `.env.example`, `.env.local.example` 등 `.env.*.example` 파일은 변수명과 가짜 값만 넣으면 커밋할 수 있습니다. 실제 비밀 값은 예제 파일에도 넣지 않습니다.
- 소스 코드, 설계 문서, 일반 JSON 설정, 의존성 잠금 파일은 정상적으로 추적합니다. `.gitignore`는 파일 내용 속 비밀정보를 검사하지 않으므로 커밋 전 변경 내용을 확인합니다.
- 브라우저에 전달되는 코드나 공개 환경 변수에는 비밀 값을 넣지 않습니다. 비밀 키를 사용하는 연동은 서버에서 처리합니다.

이미 추적된 비밀 파일은 `.gitignore`를 추가해도 추적과 과거 기록이 사라지지 않습니다.
이 경우 먼저 관련 키·토큰을 폐기하거나 재발급하고, `git rm --cached -- <파일 경로>`로 로컬 파일을 보존하면서 추적을 해제합니다.
과거 기록에 남은 비밀정보는 별도의 기록 정리와 협업자 조율이 필요합니다. 강제 푸시나 기록 삭제를 임의로 수행하지 않습니다.


## 개발 환경 제외 규칙

`.gitignore`는 GitHub 공식 [Node.gitignore](https://github.com/github/gitignore/blob/41862c835a7bd7e03373f1dbe1d2350f47063b71/Node.gitignore)를 기반으로 합니다. Node.js 의존성, Next.js 빌드 결과, TypeScript 캐시와 개발 도구 임시 파일을 제외하고, DayFlow의 기존 인증 파일 제외 규칙을 유지합니다.

개인 일정·Trello 카드·사용자 정보 등의 실제 데이터 내보내기는 루트의 `private-data/`, `personal-data/`, `local-data/`, `backups/`, `exports/`에 보관합니다. 이 폴더들과 로그인 테스트 상태(`playwright/.auth/`)는 추적하지 않습니다. 문서나 소스에 직접 적은 개인정보는 자동으로 숨겨지지 않습니다. 테스트 예제는 가상 데이터만 사용합니다.

Supabase의 로컬 임시 상태는 제외하지만, `supabase/migrations/`의 SQL과 `supabase/config.toml`은 추적합니다. 설정 파일에는 실제 비밀 값을 넣지 않습니다. Vercel·Netlify의 로컬 배포 상태도 제외하며, `vercel.json`, `netlify.toml` 같은 배포 설정은 추적합니다.


## 배포 방향

초기 배포는 Next.js와 연동하기 쉬운 Vercel을 기본으로 합니다. [Hobby 플랜](https://vercel.com/docs/plans/hobby)은 개인·비상업 용도 및 무료 사용 한도 내에서 시작하고, 상업적 운영이나 사용량 증가 시 플랜을 재검토합니다. 앱 구현 후 GitHub 저장소 연결과 배포 환경 변수 설정을 진행합니다. 비밀 키는 Vercel의 서버 환경 변수로 관리합니다.
