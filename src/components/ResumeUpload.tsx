import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Upload, Loader2, CheckCircle, ArrowLeft, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { setCandidateInfo, setResumeText, setLoading } from '@/store/slices/candidateSlice'
import axios from 'axios'

interface CandidateData {
  name: string
  email: string
  phone: string
}

interface ResumeUploadProps {
  onComplete: () => void
  onBack: () => void
}

export function ResumeUpload({ onComplete, onBack }: ResumeUploadProps) {
  const dispatch = useDispatch()
  const [file, setFile] = useState<File | null>(null)
  const [candidateData, setCandidateData] = useState<CandidateData>({
    name: '',
    email: '',
    phone: ''
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [needsManualEntry, setNeedsManualEntry] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit')
      return
    }

    setErrorMsg(null)
    setFile(selectedFile)
    setIsUploading(true)
    dispatch(setLoading(true))

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await axios.post('/api/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success) {
        const { candidate_info, resume_text } = response.data
        dispatch(setResumeText(resume_text))

        if (
          candidate_info.name === 'Not provided' ||
          candidate_info.email === 'Not provided' ||
          candidate_info.phone === 'Not provided'
        ) {
          setCandidateData({
            name: candidate_info.name !== 'Not provided' ? candidate_info.name : '',
            email: candidate_info.email !== 'Not provided' ? candidate_info.email : '',
            phone: candidate_info.phone !== 'Not provided' ? candidate_info.phone : ''
          })
          setNeedsManualEntry(true)
        } else {
          dispatch(setCandidateInfo(candidate_info))
          setUploadComplete(true)
          setTimeout(() => onComplete(), 1200)
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      let msg = 'Error uploading resume. Please try again.'
      if (error.response) {
        const detail = error.response.data?.detail
        if (typeof detail === 'string') msg = detail
        else if (Array.isArray(detail)) msg = detail.map((e: any) => e.msg).join(', ')
      } else if (error.request) {
        msg = 'Cannot connect to server. Please ensure the backend is running.'
      }
      setErrorMsg(msg)
    } finally {
      setIsUploading(false)
      dispatch(setLoading(false))
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) processFile(droppedFile)
  }

  const handleManualSubmit = () => {
    if (!candidateData.name || !candidateData.email || !candidateData.phone) {
      setErrorMsg('Please fill in all required fields')
      return
    }
    dispatch(setCandidateInfo(candidateData))
    setUploadComplete(true)
    setTimeout(() => onComplete(), 1200)
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-100px] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />

      <div className="w-full max-w-2xl relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">Upload Resume</CardTitle>
                <CardDescription>Our AI will extract your information automatically</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {!needsManualEntry && !uploadComplete && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-upload"
                  disabled={isUploading}
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    {isUploading ? (
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    ) : file ? (
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">
                        {isUploading ? 'Processing resume...' : 'Drop your resume here or click to browse'}
                      </p>
                      <p className="text-sm text-muted-foreground">PDF format, max 10MB</p>
                      {isUploading && (
                        <p className="text-sm text-primary mt-2 font-mono">Extracting information with AI...</p>
                      )}
                    </div>
                    {file && !isUploading && (
                      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{file.name}</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}

            {needsManualEntry && !uploadComplete && (
              <div className="space-y-5 animate-in">
                <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg">
                  <p className="text-sm text-accent font-medium">
                    We couldn't extract all information. Please complete the missing fields:
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground/80">Full Name</label>
                    <Input
                      value={candidateData.name}
                      onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })}
                      placeholder="John Doe"
                      className="h-11 bg-secondary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground/80">Email Address</label>
                    <Input
                      type="email"
                      value={candidateData.email}
                      onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="h-11 bg-secondary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground/80">Phone Number</label>
                    <Input
                      type="tel"
                      value={candidateData.phone}
                      onChange={(e) => setCandidateData({ ...candidateData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="h-11 bg-secondary/50"
                    />
                  </div>
                </div>
                <Button onClick={handleManualSubmit} className="w-full h-11">
                  Continue
                </Button>
              </div>
            )}

            {uploadComplete && (
              <div className="flex flex-col items-center gap-4 py-12 animate-in">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-display font-bold text-foreground mb-1">Resume processed</p>
                  <p className="text-sm text-muted-foreground">Preparing your interview...</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
