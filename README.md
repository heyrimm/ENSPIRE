# ENSPIRE 카카오톡 공지문 생성기

링크 or 텍스트 입력 → Gemini AI → 카카오톡 공지문 자동 생성

## 로컬 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local.example`을 복사해서 `.env.local` 만들기
```bash
cp .env.local.example .env.local
```
`.env.local` 파일 열어서 API 키 입력:
```
GEMINI_API_KEY=여기에_실제_키_입력
```

> Gemini API 키 발급: https://aistudio.google.com → Get API Key

### 3. 개발 서버 실행
```bash
npm run dev
```
→ http://localhost:3000 접속

---

## Vercel 배포

1. GitHub에 레포 push
2. https://vercel.com 에서 Import
3. Environment Variables에 `GEMINI_API_KEY` 추가
4. Deploy!

---

## 폴더 구조

```
enspire-notice/
├── app/
│   ├── layout.tsx          # 앱 레이아웃
│   ├── page.tsx            # 메인 UI
│   └── api/generate/
│       └── route.ts        # 크롤링 + Gemini API
├── .env.local.example      # 환경변수 예시
├── .gitignore
├── next.config.js
├── package.json
└── tsconfig.json
```
