# JOBMATE - Supabase 연동 가이드

## 🚀 세팅 순서

### 1. Supabase 프로젝트 만들기

1. https://supabase.com 접속 → GitHub 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `jobmate`, 비밀번호 설정, 지역: Northeast Asia (Tokyo)
4. 프로젝트 생성 완료되면 **Settings → API** 에서:
   - `Project URL` 복사
   - `anon public` 키 복사

### 2. DB 테이블 만들기

Supabase 대시보드 → **SQL Editor** → 아래 SQL 전체 복사 후 실행:

```sql
-- 지원 관리 테이블
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  position TEXT DEFAULT '',
  stage TEXT DEFAULT 'preparing',
  deadline DATE,
  interview_date DATE,
  interview_time TIME,
  url TEXT,
  notes TEXT,
  interview_review TEXT,
  cover_letter JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 자소서 보관함 테이블
CREATE TABLE saved_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT DEFAULT '',
  tags TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 비활성화 (로그인 없이 사용하므로)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_answers ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기/쓰기 가능하도록 정책 추가
CREATE POLICY "Allow all on applications" ON applications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on saved_answers" ON saved_answers
  FOR ALL USING (true) WITH CHECK (true);
```

### 3. 환경변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

위 값은 Supabase 대시보드 → Settings → API 에서 복사하세요.

### 4. 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인!

### 5. GitHub + Vercel 배포

```bash
git init
git add .
git commit -m "jobmate with supabase"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jobmate.git
git push -u origin main
```

Vercel에서:
1. Import → jobmate 리포지토리 선택
2. **Environment Variables** 에 `.env.local`과 동일한 키-값 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy!

---

## 📌 참고사항

- **RLS 정책**: 현재 누구나 접근 가능하게 설정됨. 나중에 로그인 기능 추가 시 user_id 기반으로 변경하면 됨
- **cover_letter**: JSONB 타입으로 저장 → `[{question: "...", answer: "..."}]` 형태
- **비용**: Supabase Free tier (500MB DB) + Vercel Free → 완전 무료
