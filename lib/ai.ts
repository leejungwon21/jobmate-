const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

export interface AnalysisResult {
  score: number
  grammar: string[]
  improvements: string[]
  jdMatch?: string
  rewritten?: string
}

export async function analyzeCoverLetter(
  question: string,
  answer: string,
  jd?: string
): Promise<AnalysisResult> {
  const jdPart = jd ? `\n\n[채용공고 JD]\n${jd}\n\n위 JD와의 부합도도 분석해주세요.` : ''

  const prompt = `당신은 한국 취업 전문 컨설턴트입니다. 아래 자기소개서 문항과 답변을 분석해주세요.

[문항] ${question}

[답변] ${answer}
${jdPart}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 반환하세요:
{
  "score": 0~100 사이 점수,
  "grammar": ["맞춤법/문법 교정 사항 목록 (없으면 빈 배열)"],
  "improvements": ["내용 강화 제안 목록 3~5개"],
  ${jd ? '"jdMatch": "JD 부합도 분석 (2~3문장)",' : ''}
  "rewritten": "개선된 버전의 답변 전체"
}`

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
    })
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Gemini API error:', err)
    throw new Error('AI 분석 요청 실패')
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  const clean = text.replace(/```json\s?/g, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    console.error('JSON parse error:', clean)
    return { score: 0, grammar: [], improvements: ['AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.'] }
  }
}
