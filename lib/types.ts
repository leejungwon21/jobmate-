export interface CoverLetterItem {
  question: string
  answer: string
}

export interface Application {
  id: string
  company: string
  position: string
  stage: string
  deadline: string | null
  interview_date: string | null
  interview_time: string | null
  url: string | null
  notes: string | null
  interview_review: string | null
  cover_letter: CoverLetterItem[]
  created_at: string
}

export interface SavedAnswer {
  id: string
  question: string
  answer: string
  tags: string | null
  created_at: string
}
