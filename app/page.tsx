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
        user_id: 'default',
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
          <Card style={{ padding:'20px',marginBottom:'12px' }}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px' }}>
              {[{l:'총 지원',v:total,c:'#1A1A1A'},{l:'서류통과',v:passed,c:'#007AFF'},{l:'면접',v:intv,c:'#FF6F00'},{l:'합격',v:finals,c:G}].map((s,i)=>(
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'24px',fontWeight:800,color:s.c,letterSpacing:'-1px' }}>{s.v}</div>
                  <div style={{ fontSize:'11px',color:'#8E8E93',fontWeight:600,marginTop:'2px' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Card>

          {apps.length>0&&(
            <Card style={{ padding:'18px 20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'14px' }}>진행 현황</div>
              <div style={{ display:'flex',gap:'3px',marginBottom:'8px' }}>
                {STAGES.filter(s=>s.id!=='rejected').map(stage=>{
                  const cnt=apps.filter(a=>a.stage===stage.id).length
                  const w=total>0?Math.max((cnt/total)*100,cnt>0?15:6):20
                  return <div key={stage.id} style={{ flex:`0 0 ${w}%`,height:'8px',borderRadius:'4px',background:cnt>0?stage.color:'#F2F2F7',transition:'all .3s' }}/>
                })}
              </div>
              <div style={{ display:'flex',gap:'3px' }}>
                {STAGES.filter(s=>s.id!=='rejected').map(s=>{
                  const c=apps.filter(a=>a.stage===s.id).length
                  return <div key={s.id} style={{ fontSize:'10px',color:c>0?s.color:'#C7C7CC',fontWeight:600,textAlign:'center',flex:1 }}>{s.label}</div>
                })}
              </div>
            </Card>
          )}

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

          {apps.length===0&&<Empty icon="📦" title="아직 지원한 곳이 없어요" sub="'+ 새 지원' 으로 시작해보세요"/>}
        </div>
      )}

      {/* ═══ APPLICATIONS ═══ */}
      {tab==='applications'&&(
        <div style={{ padding:'16px 16px 0',animation:'si .25s ease' }}>
          <div style={{ display:'flex',gap:'6px',marginBottom:'12px',overflowX:'auto',scrollbarWidth:'none' as any,padding:'0 0 4px' }}>
            {[{id:'all',label:`전체 ${total}`},...STAGES.map(s=>({id:s.id,label:`${s.label} ${apps.filter(a=>a.stage===s.id).length}`}))].map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{ padding:'7px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',border:filter===f.id?`1.5px solid ${G}`:'1.5px solid #E8E8E8',background:filter===f.id?'#E6F9EE':'#FFF',color:filter===f.id?G:'#8E8E93' }}>{f.label}</button>
            ))}
          </div>
          {filtered.length===0?<Empty icon="📋" title="지원 내역이 없어요" sub="새 지원을 추가해보세요"/>:
            <Card style={{ overflow:'hidden' }}>
              {filtered.map((a,i)=>(
                <div key={a.id} onClick={()=>setShowDetail(a)} style={{ padding:'16px 20px',borderTop:i?'1px solid #F5F5F5':'none',cursor:'pointer',transition:'background .1s' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px' }}>
                    <div><div style={{ fontSize:'15px',fontWeight:700,letterSpacing:'-.3px' }}>{a.company}</div><div style={{ fontSize:'12px',color:'#8E8E93',marginTop:'3px' }}>{a.position}</div></div>
                    <Badge stageId={a.stage}/>
                  </div>
                  <div style={{ display:'flex',gap:'12px',fontSize:'11px',color:'#C7C7CC' }}>
                    {a.deadline&&<span>마감 {fmt(a.deadline)}</span>}
                    {a.interview_date&&<span>면접 {fmt(a.interview_date)}</span>}
                    {a.cover_letter?.length>0&&<span>자소서 {a.cover_letter.length}문항</span>}
                  </div>
                </div>
              ))}
            </Card>
          }
        </div>
      )}

      {/* ═══ CALENDAR ═══ */}
      {tab==='calendar'&&(
        <div style={{ padding:'16px 16px 0',animation:'si .25s ease' }}>
          <Cal applications={apps} selectedDate={selCal} onSelectDate={d=>setSelCal(d===selCal?null:d)}/>
          {selCal&&calEvts.length>0&&(
            <Card style={{ padding:'16px 20px',marginBottom:'12px' }}>
              <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'12px' }}>{fmt(selCal)}</div>
              {calEvts.map((ev,i)=>(
                <div key={ev.id+ev.et} onClick={()=>setShowDetail(apps.find(a=>a.id===ev.id)!)} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderTop:i?'1px solid #F5F5F5':'none',cursor:'pointer' }}>
                  <div style={{ width:36,height:36,borderRadius:'10px',flexShrink:0,background:ev.et==='interview'?'#FFF3E0':'#E6F9EE',display:'grid',placeItems:'center',fontSize:'15px' }}>{ev.et==='interview'?'🎤':'📮'}</div>
                  <div><div style={{ fontSize:'13px',fontWeight:700 }}>{ev.company}</div><div style={{ fontSize:'11px',color:'#8E8E93',marginTop:'2px' }}>{ev.et==='interview'?`면접 ${ev.interview_time||''}`:'서류 마감'} · {ev.position}</div></div>
                </div>
              ))}
            </Card>
          )}
          {selCal&&calEvts.length===0&&<div style={{ textAlign:'center',padding:'20px 0',color:'#C7C7CC',fontSize:'13px' }}>이 날에는 일정이 없어요</div>}
          <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'12px',padding:'0 4px' }}>전체 일정</div>
          {allEvts.length===0?<Empty icon="📅" title="예정된 일정이 없어요" sub="지원을 추가하면 일정이 표시됩니다"/>:
            allEvts.map((ev,i)=>{
              const d=daysUntil(ev.ed)!, isI=ev.et==='interview'
              return (
                <div key={ev.id+ev.et} onClick={()=>setShowDetail(apps.find(a=>a.id===ev.id)!)} style={{ display:'flex',gap:'10px',marginBottom:'8px',cursor:'pointer' }}>
                  <div style={{ width:46,minWidth:46,textAlign:'center',padding:'8px 0',borderRadius:'12px',background:isI?'#FFF3E0':'#E6F9EE' }}>
                    <div style={{ fontSize:'17px',fontWeight:800,color:isI?'#FF6F00':G }}>{new Date(ev.ed).getDate()}</div>
                    <div style={{ fontSize:'9px',color:'#8E8E93',fontWeight:600 }}>{new Date(ev.ed).getMonth()+1}월</div>
                  </div>
                  <Card style={{ flex:1,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <div><div style={{ fontSize:'13px',fontWeight:700 }}>{ev.company}</div><div style={{ fontSize:'11px',color:'#8E8E93',marginTop:'2px' }}>{isI?`면접 ${ev.interview_time||''}`:'서류 마감'}</div></div>
                    <span style={{ fontSize:'11px',fontWeight:800,color:d<=3?'#FF3B30':'#8E8E93' }}>{d===0?'오늘':`D-${d}`}</span>
                  </Card>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ═══ LIBRARY ═══ */}
      {tab==='library'&&(
        <div style={{ padding:'16px 16px 0',animation:'si .25s ease' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',padding:'0 4px' }}>
            <div style={{ fontSize:'15px',fontWeight:700 }}>자소서 보관함</div>
            <BtnG onClick={()=>setShowAddAns(true)} sm>+ 추가</BtnG>
          </div>
          <Card style={{ padding:'16px 20px',marginBottom:'12px' }}>
            <div style={{ fontSize:'11px',fontWeight:700,color:'#8E8E93',marginBottom:'10px' }}>자주 나오는 문항</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:'6px' }}>
              {SAMPLE_Q.map((q,i)=>(<button key={i} onClick={()=>{setAf({question:q,answer:'',tags:''});setShowAddAns(true)}} style={{ padding:'7px 12px',borderRadius:'20px',border:'1px solid #E8E8E8',background:'#FFF',fontSize:'11px',color:'#666',cursor:'pointer',fontFamily:'inherit' }}>{q.length>14?q.slice(0,14)+'…':q}</button>))}
            </div>
          </Card>
          {saved.length===0?<Empty icon="✍️" title="저장된 자소서가 없어요" sub="자주 쓰는 답변을 미리 저장해두세요"/>:
            <Card style={{ overflow:'hidden' }}>
              {saved.map((ans,i)=>(
                <div key={ans.id} onClick={()=>setShowAnsDetail(ans)} style={{ padding:'16px 20px',borderTop:i?'1px solid #F5F5F5':'none',cursor:'pointer' }}>
                  <div style={{ fontSize:'14px',fontWeight:700,marginBottom:'6px' }}>{ans.question}</div>
                  <div style={{ fontSize:'12px',color:'#8E8E93',lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any }}>{ans.answer}</div>
                  {ans.tags&&<div style={{ display:'flex',gap:'4px',marginTop:'8px',flexWrap:'wrap' }}>{ans.tags.split(',').map((t,ti)=>(<span key={ti} style={{ padding:'2px 8px',borderRadius:'4px',background:'#F2F2F7',fontSize:'10px',color:'#8E8E93' }}>#{t.trim()}</span>))}</div>}
                </div>
              ))}
            </Card>
          }
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:'#FFF',borderTop:'1px solid #F0F0F0',display:'flex',justifyContent:'space-around',padding:'6px 0 max(6px, env(safe-area-inset-bottom))',zIndex:200 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',padding:'6px 16px',border:'none',background:'transparent',cursor:'pointer' }}>
            <Ico d={t.path} size={22} color={tab===t.id?G:'#C7C7CC'} stroke={tab===t.id?2.2:1.6}/>
            <span style={{ fontSize:'10px',fontWeight:tab===t.id?700:500,color:tab===t.id?G:'#C7C7CC',fontFamily:'inherit' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ ADD/EDIT MODAL ═══ */}
      <Modal isOpen={showAdd} onClose={()=>{setShowAdd(false);setForm(blankForm());setEditing(null)}} title={editing?'지원 수정':'새 지원 추가'}>
        <Inp label="회사명 *" value={form.company} onChange={v=>set('company',v)} placeholder="예: 카카오"/>
        <Inp label="포지션" value={form.position} onChange={v=>set('position',v)} placeholder="예: 프론트엔드 개발자"/>
        <Inp label="공고 URL" value={form.url} onChange={v=>set('url',v)} placeholder="https://..."/>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
          <Sel label="진행 단계" value={form.stage} onChange={v=>set('stage',v)} options={STAGES.map(s=>({value:s.id,label:s.label}))}/>
          <Inp label="서류 마감일" type="date" value={form.deadline} onChange={v=>set('deadline',v)}/>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
          <Inp label="면접 날짜" type="date" value={form.interview_date} onChange={v=>set('interview_date',v)}/>
          <Inp label="면접 시간" type="time" value={form.interview_time} onChange={v=>set('interview_time',v)}/>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <label style={{ fontSize:'12px',fontWeight:600,color:'#8E8E93' }}>자기소개서</label>
            <button onClick={()=>set('cover_letter',[...form.cover_letter,{question:'',answer:''}])} style={{ background:'transparent',border:'none',color:G,fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',textUnderlineOffset:'2px' }}>+ 문항 추가</button>
          </div>
          {form.cover_letter.map((item,idx)=>(
            <div key={idx} style={{ background:'#FAFAFA',borderRadius:'12px',padding:'14px',marginBottom:'8px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px' }}>
                <span style={{ fontSize:'12px',fontWeight:700,color:G }}>문항 {idx+1}</span>
                <button onClick={()=>set('cover_letter',form.cover_letter.filter((_:any,i:number)=>i!==idx))} style={{ background:'none',border:'none',color:'#FF3B30',cursor:'pointer',fontSize:'12px',fontWeight:600,fontFamily:'inherit' }}>삭제</button>
              </div>
              <Inp placeholder="질문" value={item.question} onChange={v=>{const u=[...form.cover_letter];u[idx]={...u[idx],question:v};set('cover_letter',u)}}/>
              <Inp placeholder="답변 작성..." value={item.answer} onChange={v=>{const u=[...form.cover_letter];u[idx]={...u[idx],answer:v};set('cover_letter',u)}} multi rows={4}/>
            </div>
          ))}
        </div>
        <Inp label="면접 복기 / 메모" value={form.interview_review} onChange={v=>set('interview_review',v)} multi rows={3} placeholder="면접 질문, 분위기, 느낀 점 등..."/>
        <Inp label="기타 메모" value={form.notes} onChange={v=>set('notes',v)} multi rows={2} placeholder="참고 사항..."/>
        <div style={{ display:'flex',gap:'8px',marginTop:'8px' }}>
          <BtnG onClick={saveApp} disabled={saving} style={{ flex:1 }}>{saving?'저장 중...':editing?'수정 완료':'저장'}</BtnG>
          <BtnW onClick={()=>{setShowAdd(false);setForm(blankForm());setEditing(null)}} style={{ flex:1 }}>취소</BtnW>
        </div>
      </Modal>

      {/* ═══ DETAIL MODAL ═══ */}
      <Modal isOpen={!!showDetail} onClose={()=>setShowDetail(null)} title="지원 상세">
        {showDetail&&(()=>{const a=showDetail;return(<>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px' }}>
            <div><div style={{ fontSize:'18px',fontWeight:800,letterSpacing:'-.5px' }}>{a.company}</div><div style={{ fontSize:'13px',color:'#8E8E93',marginTop:'3px' }}>{a.position}</div></div>
            <Badge stageId={a.stage}/>
          </div>
          {a.url&&<div style={{ marginBottom:'14px' }}><span style={{ fontSize:'11px',color:'#8E8E93',fontWeight:600 }}>공고 링크</span><div style={{ fontSize:'12px',color:G,marginTop:'3px',wordBreak:'break-all' }}>{a.url}</div></div>}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px' }}>
            {a.deadline&&<div style={{ background:'#F7F7FA',borderRadius:'12px',padding:'12px' }}><div style={{ fontSize:'10px',color:'#8E8E93',fontWeight:600 }}>서류 마감</div><div style={{ fontSize:'13px',fontWeight:700,marginTop:'4px' }}>{fmt(a.deadline)}</div></div>}
            {a.interview_date&&<div style={{ background:'#F7F7FA',borderRadius:'12px',padding:'12px' }}><div style={{ fontSize:'10px',color:'#8E8E93',fontWeight:600 }}>면접 일시</div><div style={{ fontSize:'13px',fontWeight:700,marginTop:'4px' }}>{fmt(a.interview_date)} {a.interview_time}</div></div>}
          </div>
          {a.cover_letter?.length>0&&<div style={{ marginBottom:'16px' }}><div style={{ fontSize:'12px',fontWeight:700,marginBottom:'10px' }}>자기소개서 ({a.cover_letter.length}문항)</div>{a.cover_letter.map((cl,i)=>(<div key={i} style={{ background:'#F7F7FA',borderRadius:'12px',padding:'14px',marginBottom:'8px',borderLeft:`3px solid ${G}` }}><div style={{ fontSize:'12px',fontWeight:700,color:G,marginBottom:'8px' }}>Q{i+1}. {cl.question}</div><div style={{ fontSize:'12px',color:'#666',lineHeight:1.7,whiteSpace:'pre-wrap' }}>{cl.answer}</div></div>))}</div>}
          {a.interview_review&&<div style={{ marginBottom:'16px' }}><div style={{ fontSize:'12px',fontWeight:700,marginBottom:'8px' }}>면접 복기</div><div style={{ background:'#FFF3E0',borderRadius:'12px',padding:'14px',fontSize:'12px',color:'#E65100',lineHeight:1.7,borderLeft:'3px solid #FF6F00',whiteSpace:'pre-wrap' }}>{a.interview_review}</div></div>}
          {a.notes&&<div style={{ marginBottom:'16px' }}><div style={{ fontSize:'12px',fontWeight:700,marginBottom:'8px' }}>메모</div><div style={{ fontSize:'12px',color:'#666',lineHeight:1.7,background:'#F7F7FA',borderRadius:'12px',padding:'12px',whiteSpace:'pre-wrap' }}>{a.notes}</div></div>}
          <div style={{ display:'flex',gap:'8px' }}><BtnG onClick={()=>editApp(a)} style={{ flex:1 }}>수정</BtnG><BtnR onClick={()=>delApp(a.id)} style={{ flex:1 }}>삭제</BtnR></div>
        </>)})()}
      </Modal>

      {/* ═══ ADD ANS MODAL ═══ */}
      <Modal isOpen={showAddAns} onClose={()=>{setShowAddAns(false);setAf({question:'',answer:'',tags:''})}} title="자소서 답변 저장">
        <Inp label="문항" value={af.question} onChange={v=>setAf(p=>({...p,question:v}))} placeholder="예: 지원동기를 작성해주세요"/>
        <Inp label="답변" value={af.answer} onChange={v=>setAf(p=>({...p,answer:v}))} multi rows={8} placeholder="답변을 작성하세요..."/>
        <Inp label="태그 (쉼표 구분)" value={af.tags} onChange={v=>setAf(p=>({...p,tags:v}))} placeholder="예: 지원동기, IT, 공통"/>
        <BtnG onClick={saveAns} disabled={saving} style={{ width:'100%',marginTop:'8px' }}>{saving?'저장 중...':'저장'}</BtnG>
      </Modal>

      {/* ═══ ANS DETAIL MODAL ═══ */}
      <Modal isOpen={!!showAnsDetail} onClose={()=>setShowAnsDetail(null)} title="자소서 답변">
        {showAnsDetail&&(<>
          <div style={{ fontSize:'15px',fontWeight:700,marginBottom:'14px',letterSpacing:'-.3px' }}>{showAnsDetail.question}</div>
          <div style={{ background:'#F7F7FA',borderRadius:'12px',padding:'16px',fontSize:'13px',color:'#666',lineHeight:1.8,marginBottom:'14px',whiteSpace:'pre-wrap',borderLeft:`3px solid ${G}` }}>{showAnsDetail.answer}</div>
          {showAnsDetail.tags&&<div style={{ display:'flex',gap:'5px',marginBottom:'16px',flexWrap:'wrap' }}>{showAnsDetail.tags.split(',').map((t,i)=>(<span key={i} style={{ padding:'3px 9px',borderRadius:'6px',background:'#E6F9EE',fontSize:'11px',color:G,fontWeight:600 }}>#{t.trim()}</span>))}</div>}
          <BtnR onClick={()=>delAns(showAnsDetail.id)} style={{ width:'100%' }}>삭제</BtnR>
        </>)}
      </Modal>
    </div>
  )
}
