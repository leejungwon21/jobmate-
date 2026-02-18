# JOBMATE 🟢

취업 준비의 모든 것 — 자기소개서, 지원 관리, 면접 일정, 복기를 하나로.

## 🚀 5분 안에 배포하기 (완전 무료)

### Step 1. GitHub에 올리기

1. [github.com](https://github.com) 에서 새 리포지토리 생성 (이름: `jobmate`)
2. 이 폴더에서:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jobmate.git
git push -u origin main
```

### Step 2. Vercel에 배포하기

1. [vercel.com](https://vercel.com) 에 GitHub으로 로그인
2. "New Project" 클릭
3. 방금 만든 `jobmate` 리포지토리 선택
4. "Deploy" 클릭
5. 끝! `https://jobmate-xxx.vercel.app` 형태의 URL이 생성됩니다

### Step 3. (선택) 커스텀 도메인

Vercel 대시보드 → Settings → Domains 에서 원하는 도메인을 연결할 수 있어요.

---

## 💡 로컬에서 테스트하기

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

---

## 📱 모바일 설치 (PWA)

배포 후 휴대폰 브라우저로 접속 → "홈 화면에 추가" → 앱처럼 사용 가능!

---

## 🗂 기능

- 📊 대시보드 (통계 + 파이프라인)
- 📋 지원 관리 (CRUD + 단계별 필터)
- 📅 달력 (면접/마감일 표시)
- ✍️ 자기소개서 보관함
- 🎤 면접 복기 노트
- 💾 데이터 자동 저장 (localStorage)

## 🔧 기술 스택

- Next.js 14 (App Router)
- TypeScript
- localStorage (무료 데이터 저장)
- Vercel (무료 호스팅)
