'use client'

import { useState, useMemo, useEffect } from 'react'
import * as db from '@/lib/db'
import type { Application, SavedAnswer, CoverLetterItem } from '@/lib/types'

/* ── Constants ── */
const STAGES = [
  { id: 'preparing', label: '준비중', color: '#8E8E93', bg: '#F2F2F7' },
  { id: 'applied', label: '지원완료', color: '#007AFF', bg: '#E8F2FF' },
  { id: 'doc_pass', label: '서류합격', color: '#03C75A', bg: '#E6F9EE' },
  { id: 'interview', label: '면접', color: '#FF6F00', bg: '#FFF3E0' },
  { id: 'final_pass', label: '최종합격', color: '#03C75A', bg: '#E6F9EE' },
  { id: 'rejected', label: '불합격', color: '#FF3B30', bg: '#FFEBEE' },
]
const TABS = [
  { id: 'dashboard', label: '홈', path: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z M9 21V12h6v9' },
  { id: 'applications', label: '지원', path: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { id: 'calendar', label: '일정', path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'library', label: '자소서', path: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
]
const SAMPLE_Q = ['지원동기를 작성해주세요.', '본인의 강점과 약점은?', '입사 후 포부를 작성해주세요.', '팀워크 경험을 기술해주세요.', '갈등 해결 경험을 작성해주세요.']
const G = '#03C75A'

/* ── Utils ── */
function fmt(d: string | null) { if (!d) return ''; const dt = new Date(d), w = ['일','월','화','수','목','금','토']; return `${dt.getMonth()+1}.${dt.getDate()}(${w[dt.getDay()]})` }
function daysUntil(d: string | null) { if (!d) return null; const n = new Date(); n.setHours(0,0,0,0); const t = new Date(d); t.setHours(0,0,0,0); return Math.ceil((t.getTime()-n.getTime())/864e5) }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate() }

/* ── Shared UI Components ── */
function Ico({ d, size=22, color='#C7C7CC', stroke=1.8 }: { d: string; size?: number; color?: string; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn .15s' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#FFF',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:520,maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'sheetUp .3s cubic-bezier(.22,1,.36,1)' }}>
        <div style={{ padding:'18px 20px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #F5F5F5' }}>
          <h2 style={{ margin:0,fontSize:'17px',fontWeight:700,color:'#1A1A1A' }}>{title}</h2>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:'50%',border:'none',background:'#F5F5F5',color:'#8E8E93',fontSize:'14px',cursor:'pointer',display:'grid',placeItems:'center' }}>✕</button>
        </div>
        <div style={{ padding:'16px 20px 32px',overflowY:'auto',flex:1 }}>{children}</div>
      </div>
    </div>
  )
}

function Inp({ label, value, onChange, type='text', placeholder, multi, rows=3 }: { label?: string; value: string; onChange: (v:string)=>void; type?: string; placeholder?: string; multi?: boolean; rows?: number }) {
  const s: React.CSSProperties = { width:'100%',padding:multi?'12px 14px':'11px 14px',borderRadius:'12px',border:'1px solid #E8E8E8',fontSize:'14px',fontFamily:'inherit',color:'#1A1A1A',background:'#FAFAFA',outline:'none',boxSizing:'border-box',transition:'border .15s',...(multi&&{resize:'vertical' as const,lineHeight:1.6}) }
  return (
    <div style={{ marginBottom:'14px' }}>
      {label&&<label style={{ display:'block',fontSize:'12px',fontWeight:600,color:'#8E8E93',marginBottom:'6px' }}>{label}</label>}
      {multi
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={s} onFocus={e=>{e.target.style.borderColor=G}} onBlur={e=>{e.target.style.borderColor='#E8E8E8'}} />
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} onFocus={e=>{e.target.style.borderColor=G}} onBlur={e=>{e.target.style.borderColor='#E8E8E8'}} />
      }
    </div>
  )
}

function Sel({ label, value, onChange, options }: { label?: string; value: string; onChange: (v:string)=>void; options: {value:string;label:string}[] }) {
  return (
    <div style={{ marginBottom:'14px' }}>
      {label&&<label style={{ display:'block',fontSize:'12px',fontWeight:600,color:'#8E8E93',marginBottom:'6px' }}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%',padding:'11px 14px',borderRadius:'12px',border:'1px solid #E8E8E8',fontSize:'14px',fontFamily:'inherit',color:'#1A1A1A',background:'#FAFAFA',cursor:'pointer',outline:'none',boxSizing:'border-box' as const }}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function BtnG({ children, onClick, style: cs, sm, disabled }: { children: React.ReactNode; onClick: ()=>void; style?: React.CSSProperties; sm?: boolean; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ background:disabled?'#C7C7CC':G,color:'#FFF',border:'none',padding:sm?'8px 16px':'13px 20px',borderRadius:'12px',fontSize:sm?'12px':'14px',fontWeight:700,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',transition:'all .15s',opacity:disabled?.6:1,...cs }}>{children}</button>
}
function BtnW({ children, onClick, style: cs }: { children: React.ReactNode; onClick: ()=>void; style?: React.CSSProperties }) {
  return <button onClick={onClick} style={{ background:'#FFF',color:'#1A1A1A',border:'1px solid #E8E8E8',padding:'13px 20px',borderRadius:'12px',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',...cs }}>{children}</button>
}
function BtnR({ children, onClick, style: cs }: { children: React.ReactNode; onClick: ()=>void; style?: React.CSSProperties }) {
  return <button onClick={onClick} style={{ background:'#FFF',color:'#FF3B30',border:'1px solid #FFD4D2',padding:'13px 20px',borderRadius:'12px',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',...cs }}>{children}</button>
}

function Badge({ stageId }: { stageId: string }) {
  const st = STAGES.find(s=>s.id===stageId)||STAGES[0]
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'4px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:700,color:st.color,background:st.bg }}>{st.label}</span>
}

function Card({ children, style: cs, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: ()=>void }) {
  return <div onClick={onClick} style={{ background:'#FFF',borderRadius:'16px',border:'1px solid #F0F0F0',boxShadow:'0 1px 4px rgba(0,0,0,.04)',...cs,...(onClick&&{cursor:'pointer'}) }}>{children}</div>
}

function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return <div style={{ textAlign:'center',padding:'56px 20px' }}><div style={{ fontSize:'40px',marginBottom:'12px' }}>{icon}</div><div style={{ fontSize:'14px',fontWeight:600,color:'#8E8E93',marginBottom:'4px' }}>{title}</div><div style={{ fontSize:'13px',color:'#C7C7CC' }}>{sub}</div></div>
}

/* ── Calendar ── */
function Cal({ applications, selectedDate, onSelectDate }: { applications: Application[]; selectedDate: string|null; onSelectDate: (d:string)=>void }) {
  const [vd, setVd] = useState(new Date())
  const y = vd.getFullYear(), m = vd.getMonth()
  const fd = new Date(y,m,1).getDay(), dim = new Date(y,m+1,0).getDate()
  const today = new Date()
  const ev = useMemo(()=>{
    const mp: Record<string, {et:string}[]> = {}
    applications.forEach(a=>{
      if(a.deadline){if(!mp[a.deadline])mp[a.deadline]=[];mp[a.deadline].push({et:'deadline'})}
      if(a.interview_date){if(!mp[a.interview_date])mp[a.interview_date]=[];mp[a.interview_date].push({et:'interview'})}
    })
    return mp
  },[applications])
  const cells: (number|null)[] = []; for(let i=0;i<fd;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d)
  const mn = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

  return (
    <Card style={{ padding:'20px',marginBottom:'16px' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
        <button onClick={()=>setVd(new Date(y,m-1,1))} style={{ width:34,height:34,borderRadius:'50%',border:'1px solid #E8E8E8',background:'#FFF',color:'#1A1A1A',fontSize:'15px',cursor:'pointer',display:'grid',placeItems:'center' }}>‹</button>
        <span style={{ fontSize:'16px',fontWeight:700,color:'#1A1A1A' }}>{y}년 {mn[m]}</span>
        <button onClick={()=>setVd(new Date(y,m+1,1))} style={{ width:34,height:34,borderRadius:'50%',border:'1px solid #E8E8E8',background:'#FFF',color:'#1A1A1A',fontSize:'15px',cursor:'pointer',display:'grid',placeItems:'center' }}>›</button>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px',marginBottom:'6px' }}>
        {['일','월','화','수','목','금','토'].map(w=>(<div key={w} style={{ textAlign:'center',fontSize:'11px',fontWeight:600,padding:'4px 0',color:w==='일'?'#FF3B30':w==='토'?'#007AFF':'#C7C7CC' }}>{w}</div>))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px' }}>
        {cells.map((day,i)=>{
          if(!day) return <div key={`e${i}`}/>
          const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const de = ev[ds]||[]
          const isT = sameDay(new Date(y,m,day),today), isS = selectedDate===ds
          const hI = de.some(e=>e.et==='interview'), hD = de.some(e=>e.et==='deadline')
          const dow = new Date(y,m,day).getDay()
          return (
            <button key={day} onClick={()=>onSelectDate(ds)} style={{ aspectRatio:'1',borderRadius:'12px',border:'none',background:isS?G:isT?'#F2F2F7':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px',transition:'all .1s' }}>
              <span style={{ fontSize:'13px',fontWeight:isT||isS?700:400,color:isS?'#FFF':isT?'#1A1A1A':dow===0?'#FF3B30':dow===6?'#007AFF':'#555' }}>{day}</span>
              {(hI||hD)&&<div style={{ display:'flex',gap:'2px' }}>{hI&&<span style={{ width:4,height:4,borderRadius:'50%',background:isS?'#FFF':'#FF6F00' }}/>}{hD&&<span style={{ width:4,height:4,borderRadius:'50%',background:isS?'rgba(255,255,255,.6)':G }}/>}</div>}
            </button>
          )
        })}
      </div>
      <div style={{ display:'flex',gap:'16px',marginTop:'14px',justifyContent:'center' }}>
        {[{c:'#FF6F00',l:'면접'},{c:G,l:'마감'}].map(x=>(<div key={x.l} style={{ display:'flex',alignItems:'center',gap:'4px' }}><span style={{ width:6,height:6,borderRadius:'50%',background:x.c }}/><span style={{ fontSize:'11px',color:'#8E8E93' }}>{x.l}</span></div>))}
      </div>
    </Card>
  )
}

/* ═══════════════════════════════════ */
/*           MAIN APP                 */
/* ═══════════════════════════════════ */

interface FormData {
  company: string; position: string; stage: string
  deadline: string; interview_date: string; interview_time: string
  cover_letter: CoverLetterItem[]; notes: string; url: string; interview_review: string
}

const blankForm = (): FormData => ({
  company:'', position:'', stage:'preparing', deadline:'',
  interview_date:'', interview_time:'', cover_letter:[],
  notes:'', url:'', interview_review:''
})

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [apps, setApps] = useState<Application[]>([])
  const [saved, setSaved] = useState<SavedAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<Application|null>(null)
  const [showAddAns, setShowAddAns] = useState(false)
  const [showAnsDetail, setShowAnsDetail] = useState<SavedAnswer|null>(null)
  const [editing, setEditing] = useState<string|null>(null)
  const [filter, setFilter] = useState('all')
  const [selCal, setSelCal] = useState<string|null>(null)

  const [form, setForm] = useState<FormData>(blankForm())
  const [af, setAf] = useState({ question:'', answer:'', tags:'' })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  /* ── Load data from Supabase ── */
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [a, s] = await Promise.all([db.getApplications(), db.getSavedAnswers()])
      setApps(a)
      setSaved(s)
      setLoading(false)
    }
    load()
  }, [])

  /* ── CRUD handlers ── */
  async function saveApp() {
    if (!form.company.trim()) return
    setSaving(true)
    if (editing) {
      const result = await db.updateApplication(editing, {
        company: form.company, position: form.position, stage: form.stage,
        deadline: form.deadline || null, interview_date: form.interview_date || null,
        interview_time: form.interview_time || null, url: form.url || null,
        notes: form.notes || null, interview_review: form.interview_review || null,
        cover_letter: form.cover_letter,
      })
      if (result) setApps(p => p.map(a => a.id === editing ? result : a))
    } else {
      const result = await db.createApplication({
        company: form.company, position: form.position, stage: form.stage,
        deadline: form.deadline || null, interview_date: form.interview_date || null,
        interview_time: form.interview_time || null, url: form.url || null,
        notes: form.notes || null, interview_review: form.interview_review || null,
        cover_letter: form.cover_letter,
      } as any)
      if (result) setApps(p => [result, ...p])
    }
    setSaving(false)
    setForm(blankForm()); setEditing(null); setShowAdd(false)
  }

  async function delApp(id: string) {
    const ok = await db.deleteApplication(id)
    if (ok) setApps(p => p.filter(a => a.id !== id))
    setShowDetail(null)
  }

  function editApp(a: Application) {
    setForm({
      company: a.company, position: a.position, stage: a.stage,
      deadline: a.deadline || '', interview_date: a.interview_date || '',
      interview_time: a.interview_time || '', cover_letter: a.cover_letter || [],
      notes: a.notes || '', url: a.url || '', interview_review: a.interview_review || '',
    })
    setEditing(a.id); setShowDetail(null); setShowAdd(true)
  }

  async function saveAns() {
    if (!af.question.trim()) return
    setSaving(true)
    const result = await db.createSavedAnswer({
      question: af.question, answer: af.answer, tags: af.tags || null,
    } as any)
    if (result) setSaved(p => [result, ...p])
    setSaving(false)
    setAf({ question:'', answer:'', tags:'' }); setShowAddAns(false)
  }

  async function delAns(id: string) {
    const ok = await db.deleteSavedAnswer(id)
    if (ok) setSaved(p => p.filter(a => a.id !== id))
    setShowAnsDetail(null)
  }

  /* ── Computed ── */
  const total = apps.length
  const passed = apps.filter(a => ['doc_pass','interview','final_pass'].includes(a.stage)).length
  const intv = apps.filter(a => a.stage === 'interview').length
  const finals = apps.filter(a => a.stage === 'final_pass').length
  const upcoming = apps.filter(a => a.interview_date && (daysUntil(a.interview_date) ?? -1) >= 0).sort((a,b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime())
  const deadlines = apps.filter(a => a.deadline && (daysUntil(a.deadline) ?? -1) >= 0 && a.stage === 'preparing').sort((a,b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
  const filtered = filter === 'all' ? apps : apps.filter(a => a.stage === filter)

  const calEvts = useMemo(() => {
    if (!selCal) return []
    return [
      ...apps.filter(a => a.deadline === selCal).map(a => ({ ...a, et: 'deadline' as const })),
      ...apps.filter(a => a.interview_date === selCal).map(a => ({ ...a, et: 'interview' as const })),
    ]
  }, [selCal, apps])

  const allEvts = useMemo(() => [
    ...apps.filter(a => a.deadline && (daysUntil(a.deadline) ?? -1) >= 0).map(a => ({ ...a, et: 'deadline' as const, ed: a.deadline! })),
    ...apps.filter(a => a.interview_date && (daysUntil(a.interview_date) ?? -1) >= 0).map(a => ({ ...a, et: 'interview' as const, ed: a.interview_date! })),
  ].sort((a,b) => new Date(a.ed).getTime() - new Date(b.ed).getTime()), [apps])

  /* ── Loading state ── */
  if (loading) return (
    <div style={{ display:'grid',placeItems:'center',minHeight:'100vh',background:'#F7F7FA' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40,height:40,borderRadius:'10px',background:G,display:'grid',placeItems:'center',margin:'0 auto 12px' }}>
          <span style={{ color:'#FFF',fontSize:'18px',fontWeight:900 }}>J</span>
        </div>
        <div style={{ color:'#8E8E93',fontSize:'14px' }}>불러오는 중...</div>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#F7F7FA',minHeight:'100vh',maxWidth:480,margin:'0 auto',position:'relative',paddingBottom:80,color:'#1A1A1A' }}>

      {/* Header */}
      <div style={{ padding:'14px 20px',position:'sticky',top:0,zIndex:100,background:'#FFF',borderBottom:'1px solid #F0F0F0' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
            <div style={{ width:28,height:28,borderRadius:'8px',background:G,display:'grid',placeItems:'center' }}>
              <span style={{ color:'#FFF',fontSize:'14px',fontWeight:900 }}>J</span>
            </div>
            <h1 style={{ margin:0,fontSize:'18px',fontWeight:800,letterSpacing:'-.5px' }}>JOBMATE</h1>
          </div>
          <BtnG onClick={()=>{setForm(blankForm());setEditing(null);setShowAdd(true)}} sm>+ 새 지원</BtnG>
        </div>
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {tab==='dashboard'&&(
        <div style={{ padding:'16px 16px 0',animation:'si .25s ease' }}>
          {/* 취업 현황 */}
          <Card style={{ padding:'24px 20px',marginBottom:'12px' }}>
            <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'16px' }}>취업 현황</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px' }}>
              <div style={{ background:'#F7F7FA',borderRadius:'14px',padding:'16px' }}>
                <div style={{ fontSize:'11px',color:'#8E8E93',fontWeight:600 }}>총 지원</div>
                <div style={{ fontSize:'28px',fontWeight:800,color:'#1A1A1A',letterSpacing:'-1px',marginTop:'4px' }}>{total}<span style={{ fontSize:'13px',fontWeight:600,color:'#8E8E93',marginLeft:'2px' }}>건</span></div>
              </div>
              <div style={{ background:'#E6F9EE',borderRadius:'14px',padding:'16px' }}>
                <div style={{ fontSize:'11px',color:G,fontWeight:600 }}>최종 합격</div>
                <div style={{ fontSize:'28px',fontWeight:800,color:G,letterSpacing:'-1px',marginTop:'4px' }}>{finals}<span style={{ fontSize:'13px',fontWeight:600,color:'#8E8E93',marginLeft:'2px' }}>건</span></div>
              </div>
            </div>
          </Card>

          {/* 비율 분석 */}
          {total>0&&(
            <Card style={{ padding:'20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'16px' }}>비율 분석</div>
              {[
                {label:'서류 통과율',value:total>0?Math.round((passed/total)*100):0,color:'#007AFF',count:`${passed}/${total}`},
                {label:'면접 전환율',value:passed>0?Math.round((intv/passed)*100):0,color:'#FF6F00',count:`${intv}/${passed}`},
                {label:'최종 합격률',value:total>0?Math.round((finals/total)*100):0,color:G,count:`${finals}/${total}`},
              ].map((r,i)=>(
                <div key={i} style={{ marginBottom:i<2?'14px':'0' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                    <span style={{ fontSize:'13px',fontWeight:600,color:'#1A1A1A' }}>{r.label}</span>
                    <div style={{ display:'flex',alignItems:'baseline',gap:'4px' }}>
                      <span style={{ fontSize:'18px',fontWeight:800,color:r.color }}>{r.value}%</span>
                      <span style={{ fontSize:'11px',color:'#C7C7CC' }}>{r.count}</span>
                    </div>
                  </div>
                  <div style={{ height:'6px',borderRadius:'3px',background:'#F2F2F7',overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:'3px',background:r.color,width:`${r.value}%`,transition:'width .5s ease' }}/>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* 단계별 현황 */}
          {total>0&&(
            <Card style={{ padding:'20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'14px' }}>단계별 현황</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px' }}>
                {STAGES.map(s=>{
                  const cnt=apps.filter(a=>a.stage===s.id).length
                  return (
                    <div key={s.id} style={{ textAlign:'center',padding:'12px 4px',borderRadius:'12px',background:cnt>0?s.bg:'#F7F7FA' }}>
                      <div style={{ fontSize:'20px',fontWeight:800,color:cnt>0?s.color:'#C7C7CC' }}>{cnt}</div>
                      <div style={{ fontSize:'10px',fontWeight:600,color:cnt>0?s.color:'#C7C7CC',marginTop:'2px' }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* 이번 주 할 일 */}
          {(()=>{
            const now=new Date();now.setHours(0,0,0,0)
            const endOfWeek=new Date(now);endOfWeek.setDate(now.getDate()+(7-now.getDay()))
            const weekEvents=[
              ...apps.filter(a=>a.deadline&&(()=>{const d=new Date(a.deadline);d.setHours(0,0,0,0);return d>=now&&d<=endOfWeek})()).map(a=>({...a,et:'deadline' as const,ed:a.deadline!})),
              ...apps.filter(a=>a.interview_date&&(()=>{const d=new Date(a.interview_date);d.setHours(0,0,0,0);return d>=now&&d<=endOfWeek})()).map(a=>({...a,et:'interview' as const,ed:a.interview_date!})),
            ].sort((a,b)=>new Date(a.ed).getTime()-new Date(b.ed).getTime())
            if(weekEvents.length===0) return null
            return (
              <Card style={{ padding:'18px 20px',marginBottom:'12px' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px' }}>
                  <div style={{ fontSize:'13px',fontWeight:700 }}>📋 이번 주 할 일</div>
                  <span style={{ fontSize:'11px',color:'#8E8E93',fontWeight:600 }}>{weekEvents.length}건</span>
                </div>
                {weekEvents.map((ev,i)=>{
                  const d=daysUntil(ev.ed)!
                  const isI=ev.et==='interview'
                  return (
                    <div key={ev.id+ev.et} onClick={()=>setShowDetail(apps.find(a=>a.id===ev.id)!)} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderTop:i?'1px solid #F5F5F5':'none',cursor:'pointer' }}>
                      <div style={{ width:36,height:36,borderRadius:'10px',flexShrink:0,background:isI?'#FFF3E0':'#E6F9EE',display:'grid',placeItems:'center',fontSize:'14px' }}>{isI?'🎤':'📮'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px',fontWeight:700 }}>{ev.company}</div>
                        <div style={{ fontSize:'11px',color:'#8E8E93',marginTop:'2px' }}>{isI?`면접 ${ev.interview_time||''}`:'서류 마감'} · {fmt(ev.ed)}</div>
                      </div>
                      <div style={{ padding:'4px 8px',borderRadius:'6px',fontSize:'11px',fontWeight:800,color:d<=1?'#FF3B30':d<=3?'#FF6F00':'#8E8E93',background:d<=1?'#FFEBEE':d<=3?'#FFF3E0':'#F2F2F7' }}>{d===0?'오늘':d===1?'내일':`D-${d}`}</div>
                    </div>
                  )
                })}
              </Card>
            )
          })()}

          {/* 다가오는 면접 */}
          {upcoming.length>0&&(
            <Card style={{ padding:'18px 20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'14px' }}>다가오는 면접</div>
              {upcoming.slice(0,3).map((a,i)=>{
                const d=daysUntil(a.interview_date)!
                return (
                  <div key={a.id} onClick={()=>setShowDetail(a)} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:i?'1px solid #F5F5F5':'none',cursor:'pointer' }}>
                    <div><div style={{ fontSize:'14px',fontWeight:700 }}>{a.company}</div><div style={{ fontSize:'12px',color:'#8E8E93',marginTop:'2px' }}>{a.position} · {fmt(a.interview_date)} {a.interview_time}</div></div>
                    <div style={{ padding:'4px 10px',borderRadius:'6px',fontSize:'12px',fontWeight:800,color:d<=3?'#FF3B30':'#FF6F00',background:d<=3?'#FFEBEE':'#FFF3E0' }}>D-{d}</div>
                  </div>
                )
              })}
            </Card>
          )}

          {/* 마감 임박 */}
          {deadlines.length>0&&(
            <Card style={{ padding:'18px 20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'14px' }}>마감 임박</div>
              {deadlines.slice(0,3).map((a,i)=>{
                const d=daysUntil(a.deadline)!
                return (
                  <div key={a.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:i?'1px solid #F5F5F5':'none' }}>
                    <div><div style={{ fontSize:'14px',fontWeight:700 }}>{a.company}</div><div style={{ fontSize:'12px',color:'#8E8E93',marginTop:'2px' }}>{a.position} · 마감 {fmt(a.deadline)}</div></div>
                    <div style={{ padding:'4px 10px',borderRadius:'6px',fontSize:'12px',fontWeight:800,color:d<=3?'#FF3B30':G,background:d<=3?'#FFEBEE':'#E6F9EE' }}>D-{d}</div>
                  </div>
                )
              })}
            </Card>
          )}

          {/* 최근 활동 */}
          {apps.length>0&&(
            <Card style={{ padding:'18px 20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'14px' }}>🕐 최근 활동</div>
              {apps.slice(0,5).map((a,i)=>{
                const daysAgo=Math.floor((Date.now()-new Date(a.created_at).getTime())/864e5)
                const timeLabel=daysAgo===0?'오늘':daysAgo===1?'어제':`${daysAgo}일 전`
                const st=STAGES.find(s=>s.id===a.stage)||STAGES[0]
                return (
                  <div key={a.id} onClick={()=>setShowDetail(a)} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderTop:i?'1px solid #F5F5F5':'none',cursor:'pointer' }}>
                    <div style={{ width:4,height:4,borderRadius:'50%',background:st.color,flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                        <span style={{ fontSize:'13px',fontWeight:700 }}>{a.company}</span>
                        <span style={{ fontSize:'10px',fontWeight:600,color:st.color,background:st.bg,padding:'2px 6px',borderRadius:'4px' }}>{st.label}</span>
                      </div>
                      <div style={{ fontSize:'11px',color:'#C7C7CC',marginTop:'2px' }}>{a.position}</div>
                    </div>
                    <span style={{ fontSize:'11px',color:'#C7C7CC',flexShrink:0 }}>{timeLabel}</span>
                  </div>
                )
              })}
            </Card>
          )}

          {apps.length===0&&<Empty icon="📦" title="아직 지원한 곳이 없어요" sub="'+ 새 지원' 으로 시작해보세요"/>}
        </div>
      )}

      