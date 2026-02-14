import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Search, User, Calendar, MessageSquare, Mic, ChevronRight, ArrowUpDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import axios from 'axios'

interface Interview {
  id: string
  candidate_name: string
  candidate_email: string
  candidate_phone: string
  mode: 'chat' | 'voice'
  score: number
  created_at: string
  summary: string
  transcript: string
}

export function Dashboard() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score')
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInterviews()
  }, [])

  useEffect(() => {
    filterAndSortInterviews()
  }, [interviews, searchQuery, sortBy])

  const fetchInterviews = async () => {
    try {
      const response = await axios.get(
        '/api/interviews'
      )
      if (response.data.success) {
        setInterviews(response.data.interviews)
      }
    } catch (error) {
      console.error('Error fetching interviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortInterviews = () => {
    let filtered = interviews.filter(interview =>
      interview.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.candidate_email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.sort((a, b) => {
      if (sortBy === 'score') {
        return b.score - a.score
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredInterviews(filtered)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (selectedInterview) {
    return <InterviewDetail interview={selectedInterview} onBack={() => setSelectedInterview(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Interviewer Dashboard</h1>
          <p className="text-muted-foreground">
            Review and manage candidate interviews
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSortBy(sortBy === 'score' ? 'date' : 'score')}
                className="gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                Sort by {sortBy === 'score' ? 'Score' : 'Date'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{interviews.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {interviews.length > 0
                  ? Math.round(interviews.reduce((sum, i) => sum + i.score, 0) / interviews.length)
                  : 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Performers (≥80)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {interviews.filter(i => i.score >= 80).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Candidate Interviews</CardTitle>
            <CardDescription>
              Click on any interview to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading interviews...
              </div>
            ) : filteredInterviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No interviews found matching your search' : 'No interviews yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    onClick={() => setSelectedInterview(interview)}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{interview.candidate_name}</h3>
                        <Badge variant="outline" className="gap-1">
                          {interview.mode === 'chat' ? (
                            <><MessageSquare className="h-3 w-3" /> Chat</>
                          ) : (
                            <><Mic className="h-3 w-3" /> Voice</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{interview.candidate_email}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(interview.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-2 rounded-lg font-semibold ${getScoreColor(interview.score)}`}>
                        {interview.score}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
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
  const summary = interview.summary ? JSON.parse(interview.summary) : null
  const transcript = interview.transcript ? JSON.parse(interview.transcript) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto py-8">
        <Button variant="outline" onClick={onBack} className="mb-6">
          ← Back to Dashboard
        </Button>

        {/* Candidate Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{interview.candidate_name}</CardTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Email: {interview.candidate_email}</p>
                  <p>Phone: {interview.candidate_phone}</p>
                  <p>Date: {formatDate(interview.created_at)}</p>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${getScoreColor(interview.score).split(' ')[0]}`}>
                  {interview.score}
                </div>
                <Badge variant={interview.mode === 'chat' ? 'default' : 'secondary'}>
                  {interview.mode === 'chat' ? 'Chat Interview' : 'Voice Interview'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary */}
        {summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Interview Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-600">✓ Strengths</h3>
                <ul className="space-y-2">
                  {summary.strengths?.map((strength: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-orange-600">⚠ Areas for Improvement</h3>
                <ul className="space-y-2">
                  {summary.improvements?.map((improvement: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">Recommendation:</span>
                  <Badge variant={summary.recommendation === 'Highly Recommended' ? 'default' : 'secondary'} className="text-base px-4 py-1">
                    {summary.recommendation}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Transcript</CardTitle>
            <CardDescription>
              Complete record of questions and answers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(transcript) && transcript.map((item: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">Question {idx + 1}</Badge>
                      {item.difficulty && (
                        <Badge variant="outline">{item.difficulty}</Badge>
                      )}
                      {item.score !== undefined && (
                        <Badge variant="secondary">Score: {item.score}</Badge>
                      )}
                    </div>
                    <p className="font-medium">{item.question}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <Badge variant="secondary" className="mb-2">Answer</Badge>
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600 bg-green-50'
  if (score >= 60) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

