import { createClient } from './supabase'
import type { Application, SavedAnswer, CoverLetterItem } from './types'

const supabase = createClient()

/* ── Applications ── */

export async function getApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('getApplications error:', error); return [] }
  return (data || []).map(row => ({
    ...row,
    cover_letter: row.cover_letter || [],
  }))
}

export async function createApplication(app: Omit<Application, 'id' | 'created_at'>): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .insert([app])
    .select()
    .single()

  if (error) { console.error('createApplication error:', error); return null }
  return data
}

export async function updateApplication(id: string, app: Partial<Application>): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .update(app)
    .eq('id', id)
    .select()
    .single()

  if (error) { console.error('updateApplication error:', error); return null }
  return data
}

export async function deleteApplication(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)

  if (error) { console.error('deleteApplication error:', error); return false }
  return true
}

/* ── Saved Answers ── */

export async function getSavedAnswers(): Promise<SavedAnswer[]> {
  const { data, error } = await supabase
    .from('saved_answers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('getSavedAnswers error:', error); return [] }
  return data || []
}

export async function createSavedAnswer(ans: Omit<SavedAnswer, 'id' | 'created_at'>): Promise<SavedAnswer | null> {
  const { data, error } = await supabase
    .from('saved_answers')
    .insert([ans])
    .select()
    .single()

  if (error) { console.error('createSavedAnswer error:', error); return null }
  return data
}

export async function deleteSavedAnswer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_answers')
    .delete()
    .eq('id', id)

  if (error) { console.error('deleteSavedAnswer error:', error); return false }
  return true
}

/* ── Portfolios ── */

export async function getPortfolios(): Promise<Portfolio[]> {
  const { data, error } = await supabase.from('portfolios').select('*').order('created_at', { ascending: false })
  if (error) { console.error('getPortfolios error:', error); return [] }
  return data || []
}

export async function createPortfolio(p: Omit<Portfolio, 'id' | 'created_at'>): Promise<Portfolio | null> {
  const { data, error } = await supabase.from('portfolios').insert([p]).select().single()
  if (error) { console.error('createPortfolio error:', error); return null }
  return data
}

export async function updatePortfolio(id: string, p: Partial<Portfolio>): Promise<Portfolio | null> {
  const { data, error } = await supabase.from('portfolios').update(p).eq('id', id).select().single()
  if (error) { console.error('updatePortfolio error:', error); return null }
  return data
}

export async function deletePortfolio(id: string): Promise<boolean> {
  const { error } = await supabase.from('portfolios').delete().eq('id', id)
  if (error) { console.error('deletePortfolio error:', error); return false }
  return true
}
