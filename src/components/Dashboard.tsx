import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Search, User, Calendar, MessageSquare, Mic, ChevronRight, ArrowUpDown, ArrowLeft, TrendingUp, Award, Video } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import axios from 'axios'

interface Interview {
  id: string
  candidate_name: string
  candidate_email: string
  candidate_phone: string
  mode: 'chat' | 'voice' | 'live'
  score: number
  created_at: string
  summary: string
  transcript: string
}

interface DashboardProps {
  onBack: () => void
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-primary bg-primary/10'
  if (score >= 60) return 'text-accent bg-accent/10'
  return 'text-destructive bg-destructive/10'
}

function getModeIcon(mode: string) {
  if (mode === 'voice') return <Mic className="h-3 w-3" />
  if (mode === 'live') return <Video className="h-3 w-3" />
  return <MessageSquare className="h-3 w-3" />
}

export function Dashboard({ onBack }: DashboardProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score')
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchInterviews() }, [])

  useEffect(() => {
    let filtered = interviews.filter(i =>
      i.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.candidate_email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    filtered.sort((a, b) =>
      sortBy === 'score' ? b.score - a.score : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    setFilteredInterviews(filtered)
  }, [interviews, searchQuery, sortBy])

  const fetchInterviews = async () => {
    try {
      const response = await axios.get('/api/interviews')
      if (response.data.success) setInterviews(response.data.interviews)
    } catch {
      // Supabase may not be configured
    } finally {
      setIsLoading(false)
    }
  }

  if (selectedInterview) {
    return <InterviewDetail interview={selectedInterview} onBack={() => setSelectedInterview(null)} />
  }

  return (
    <div className="min-h-screen bg-background grain p-4">
      <div className="max-w-6xl mx-auto py-6 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold text-foreground mb-1">Interviewer Dashboard</h1>
          <p className="text-muted-foreground text-sm">Review and manage candidate interviews</p>
        </div>

        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
              <Button variant="outline" onClick={() => setSortBy(sortBy === 'score' ? 'date' : 'score')} className="gap-2 border-border/50">
                <ArrowUpDown className="h-4 w-4" />
                Sort by {sortBy === 'score' ? 'Score' : 'Date'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Total Interviews', value: interviews.length, icon: MessageSquare },
            { label: 'Average Score', value: interviews.length > 0 ? Math.round(interviews.reduce((s, i) => s + i.score, 0) / interviews.length) : 0, icon: TrendingUp },
            { label: 'High Performers', value: interviews.filter(i => i.score >= 80).length, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/50 bg-card/80">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">Candidate Interviews</CardTitle>
            <CardDescription className="text-xs">Click any interview to view details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-12 text-muted-foreground text-sm">Loading interviews...</p>
            ) : filteredInterviews.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground text-sm">{searchQuery ? 'No results' : 'No interviews yet'}</p>
            ) : (
              <div className="space-y-2">
                {filteredInterviews.map((interview) => (
                  <button
                    key={interview.id}
                    onClick={() => setSelectedInterview(interview)}
                    className="w-full flex items-center gap-4 p-4 glass rounded-lg hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">{interview.candidate_name}</h3>
                        <Badge variant="outline" className="gap-1 text-[10px] font-mono border-border/50">
                          {getModeIcon(interview.mode)} {interview.mode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{interview.candidate_email}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(interview.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${getScoreColor(interview.score)}`}>
                        {interview.score}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface InterviewDetailProps {
  interview: Interview
  onBack: () => void
}

function InterviewDetail({ interview, onBack }: InterviewDetailProps) {
  let summary: any = null
  let transcriptData: any[] = []
  try { summary = interview.summary ? JSON.parse(interview.summary) : null } catch { summary = null }
  try { transcriptData = interview.transcript ? JSON.parse(interview.transcript) : [] } catch { transcriptData = [] }

  return (
    <div className="min-h-screen bg-background grain p-4">
      <div className="max-w-4xl mx-auto py-6 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-display text-2xl mb-2">{interview.candidate_name}</CardTitle>
                <div className="space-y-1 text-xs text-muted-foreground font-mono">
                  <p>{interview.candidate_email}</p>
                  <p>{interview.candidate_phone}</p>
                  <p>{formatDate(interview.created_at)}</p>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-display font-bold mb-1 ${getScoreColor(interview.score).split(' ')[0]}`}>
                  {interview.score}
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {getModeIcon(interview.mode)} {interview.mode}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {summary && (
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {summary.strengths && (
                <div className="glass rounded-lg p-4">
                  <h3 className="font-display font-semibold text-primary mb-2 text-sm">Strengths</h3>
                  <ul className="space-y-1">
                    {summary.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="text-primary mt-0.5">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.improvements && (
                <div className="glass rounded-lg p-4">
                  <h3 className="font-display font-semibold text-accent mb-2 text-sm">Improvements</h3>
                  <ul className="space-y-1">
                    {summary.improvements.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="text-accent mt-0.5">→</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.recommendation && (
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">Recommendation</span>
                  <Badge variant="secondary" className="font-mono">{summary.recommendation}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {Array.isArray(transcriptData) && transcriptData.length > 0 && (
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transcriptData.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="glass rounded-lg p-4 border-l-2 border-primary">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="text-xs font-mono">Q{idx + 1}</Badge>
                        {item.difficulty && <Badge variant="secondary" className="text-xs font-mono">{item.difficulty}</Badge>}
                        {item.score !== undefined && <Badge variant="secondary" className="text-xs font-mono">Score: {item.score}</Badge>}
                      </div>
                      <p className="text-sm text-foreground">{item.question}</p>
                    </div>
                    <div className="glass rounded-lg p-4 border-l-2 border-accent">
                      <Badge variant="secondary" className="text-xs font-mono mb-2">Answer</Badge>
                      <p className="text-sm text-foreground/80">{item.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
