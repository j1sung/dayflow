# dayflow

스케줄 관리 웹앱

## 기본 저장소

DayFlow 웹앱의 소스 코드와 설계 문서는 https://github.com/j1sung/dayflow 에서 관리합니다.
앞선 MVP 설계의 권장 스택은 Next.js + Supabase(PostgreSQL)이며, Google Calendar API와 Trello API를 연동합니다. Next.js + TypeScript로 첫 번째 동작 가능한 MVP를 구현했습니다.

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

## 로컬 실행

Node.js 22.6 이상이 필요합니다. 저장소에서 다음 명령을 실행합니다.

```sh
npm ci
npm run dev
```

[로컬 DayFlow](http://127.0.0.1:3000)를 엽니다. 외부 서비스 키 없이도 플래너를 사용할 수 있습니다. 처음에는 빈 화면으로 시작하며, ‘예시로 먼저 둘러보기’는 가상의 데이터만 생성합니다.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## 구현 범위

- 할 일 추가·수정·삭제·완료, 예상시간·분류·요일 설정, 검색·상태 필터
- 월~일 시간표로 드래그하거나 ‘배치하기’ 후 빈 시간 클릭/키보드 선택
- 일정 이동, 날짜·시작 시간·길이 수정, 할 일의 여러 시간 블록 분할 배치, 겹침 방지
- 주간 이동, 배치·미배정 시간 및 완료 개수 집계
- 브라우저 자동 저장, JSON 백업·복원, Google Calendar용 ICS 내보내기
- Trello 보드의 카드 가져오기 및 요일별 리스트 인식 (인증 설정 필요)
- Google OAuth 연결 및 버튼으로 이번 주 계획 반영 (인증 설정 필요)
- Supabase 이메일 로그인 및 계정별 수동 저장·불러오기 (프로젝트 설정 필요)

AI 자동 계획, Trello 원본에 수정 반영, 기존 Google 일정 읽기, 생활 루틴을 고려한 실시간 가용시간 계산은 후속 구현 범위입니다. 취침시간 설정은 저장하며 현재 시간 집계는 배치한 작업 기준입니다. 현재 MVP는 공동 편집이 아닌 개인 플래너입니다.

## 외부 서비스 설정

`.env.example`을 `.env.local`로 복사해 실제 값을 입력합니다. `.env.local`은 커밋하지 않습니다. 비밀번호를 코드나 채팅에 공유할 필요는 없습니다.

### Google Calendar

1. 사용자 소유 Google Cloud 프로젝트에서 Calendar API를 활성화하고 OAuth 동의 화면을 설정합니다. 테스트 모드에서는 사용할 Google 계정을 테스트 사용자로 등록합니다.
2. 웹 애플리케이션용 OAuth 클라이언트를 생성하고 리디렉션 URI를 `http://127.0.0.1:3000/api/google/callback`로 등록합니다. 배포 후에는 실제 HTTPS 도메인 URI를 추가합니다.
3. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`, 임의의 32자 이상 `SESSION_SECRET`을 설정하고 앱을 재시작합니다. 배포 환경의 `APP_URL`은 HTTPS여야 합니다.
4. 앱의 ‘서비스 연결’에서 Google 계정을 연결한 다음, 시간표를 확인하고 ‘Google Calendar에 반영’을 누릅니다.

기본 캘린더에 반영하며 브라우저의 IANA 시간대를 사용합니다. 같은 블록은 같은 이벤트 ID로 갱신하고, 이번 주에서 제거한 DayFlow 일정은 다음 반영 시 캘린더에서도 제거합니다. 빈 주를 반영하면 확인 후 해당 주의 DayFlow 일정만 제거합니다. 다른 서비스나 직접 작성한 이벤트는 건드리지 않습니다. 여러 기기에서는 최신 클라우드 계획을 먼저 불러온 뒤 반영하세요. 토큰은 암호화한 HttpOnly 쿠키에 저장하며, 연결 해제는 해당 브라우저의 쿠키를 지웁니다. Google 계정의 앱 접근 권한 자체를 철회하려면 Google 계정 설정에서 해제합니다.

### Trello

앱의 ‘서비스 연결’에서 보드 주소의 `/b/` 다음 ID, 본인의 Trello API Key와 읽기 토큰을 입력합니다. [공식 인증 안내](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)를 참고합니다. 토큰은 브라우저 저장소나 서버 파일에 저장하지 않고 가져오기 요청에만 사용합니다. 최대 1,000개 카드를 가져오며 예상시간 기본값은 60분입니다. 동일한 원본 카드는 중복 추가하지 않으므로, 다시 가져오기로 기존 카드 내용이 갱신되지는 않습니다. 웹앱에서 제목·시간·요일을 수정할 수 있습니다.

### Supabase

1. 사용자 소유 프로젝트의 SQL 편집기에서 `supabase/migrations/202611090001_dayflow_plans.sql`을 한 번 적용합니다. 사용자별 접근 정책(RLS)과 저장 버전 충돌 방지 함수를 포함합니다.
2. 이메일 인증을 활성화하고 Auth의 Site URL 및 Redirect URL에 로컬 주소와 향후 배포 도메인을 등록합니다. 실제 공개 서비스에서는 이메일 발송 설정과 사용 한도를 확인합니다.
3. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에 프로젝트 URL과 **공개 publishable 키**를 넣습니다. 서비스 역할 키/secret 키는 넣지 않습니다.
4. ‘설정 및 데이터’에서 이메일 로그인 링크를 받고 같은 브라우저에서 엽니다. 계정의 계획은 ‘내 계정에 저장’으로 저장하고, 다른 기기에서 ‘클라우드에서 불러오기’로 불러옵니다. 자동으로 클라우드에 덮어쓰지 않습니다.

로컬 계획은 계정과 별도로 브라우저에 남습니다. 공용 기기에서는 로그아웃과 별개로 필요한 백업 후 로컬 데이터도 삭제합니다. 다른 기기에서 먼저 저장했다면 기존 계획을 조용히 덮어쓰지 않고 충돌을 표시합니다.

## Vercel 배포 준비

GitHub의 `j1sung/dayflow`를 Import하고 프레임워크를 Next.js로 선택합니다. 루트 디렉터리는 저장소 루트이며 빌드 명령은 `npm run build`입니다. 위 환경 변수들을 Vercel 설정에 등록하고 `APP_URL`을 실제 배포 도메인으로 바꿉니다. 공개 Supabase 환경 변수는 빌드 시 반영되므로 변경 후 다시 배포합니다. Google OAuth와 Supabase의 허용 주소도 일치시킵니다.

현재는 로컬 구현·검증 단계이며 Vercel 계정 연결이나 실서비스 배포는 수행하지 않았습니다. 외부 계정 설정이 필요한 OAuth·이메일 발송·실제 캘린더/DB 쓰기 검증은 계정 연결 후 진행합니다.
