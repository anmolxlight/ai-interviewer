import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Upload, Loader2, CheckCircle } from 'lucide-react'
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
}

export function ResumeUpload({ onComplete }: ResumeUploadProps) {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.pdf')) {
      alert('Please upload a PDF file')
      return
    }

    setFile(selectedFile)
    setIsUploading(true)
    dispatch(setLoading(true))

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await axios.post(
        '/api/upload-resume',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      if (response.data.success) {
        const { candidate_info, resume_text } = response.data
        
        dispatch(setResumeText(resume_text))
        
        // Check if any required field is missing
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
          setTimeout(() => onComplete(), 1500)
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      console.error('Error details:', {
        response: error.response,
        request: error.request,
        message: error.message,
        config: error.config
      })
      
      let errorMessage = 'Error uploading resume. Please try again.'
      
      if (error.response) {
        // Backend returned an error
        console.error('Backend error:', error.response.data)
        const detail = error.response.data?.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          // Validation error from FastAPI
          errorMessage = detail.map(e => e.msg).join(', ')
        } else {
          errorMessage = JSON.stringify(error.response.data)
        }
      } else if (error.request) {
        // Request was made but no response
        console.error('No response from server')
        errorMessage = 'Cannot connect to server. Please ensure the backend is running on http://localhost:8000'
      } else {
        // Something else happened
        console.error('Request setup error:', error.message)
        errorMessage = error.message || errorMessage
      }
      
      alert(errorMessage)
    } finally {
      setIsUploading(false)
      dispatch(setLoading(false))
    }
  }

  const handleManualSubmit = () => {
    if (!candidateData.name || !candidateData.email || !candidateData.phone) {
      alert('Please fill in all required fields')
      return
    }

    dispatch(setCandidateInfo(candidateData))
    setUploadComplete(true)
    setTimeout(() => onComplete(), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 p-4">
      <style>{`
        .upload-zone {
          transition: all 0.3s ease;
        }
        .upload-zone:hover {
          transform: scale(1.02);
          border-color: rgb(99, 102, 241);
        }
      `}</style>
      
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 text-white rounded-t-xl">
          <div className="flex items-center justify-center mb-4">
            <Upload className="h-16 w-16" />
          </div>
          <CardTitle className="text-4xl text-center mb-2">Welcome to AI Interview Assistant</CardTitle>
          <CardDescription className="text-blue-100 text-lg text-center">
            Upload your resume to get started. Our AI will extract your information automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {!needsManualEntry && !uploadComplete && (
            <div className="upload-zone border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gradient-to-br from-white to-gray-50">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
                disabled={isUploading}
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-6">
                  {isUploading ? (
                    <div className="relative">
                      <Loader2 className="h-20 w-20 text-indigo-600 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 bg-indigo-100 rounded-full"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                      <Upload className="h-10 w-10 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold text-gray-800 mb-2">
                      {isUploading ? 'Processing Your Resume...' : 'Click to Upload Resume'}
                    </p>
                    <p className="text-gray-600 mb-4">PDF format required (Max 10MB)</p>
                    {isUploading && (
                      <p className="text-sm text-indigo-600 animate-pulse">
                        Using AI to extract your information...
                      </p>
                    )}
                  </div>
                  {file && !isUploading && (
                    <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-900">{file.name}</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {needsManualEntry && !uploadComplete && (
            <div className="space-y-6">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <p className="text-sm text-amber-800 font-medium">
                  We couldn't extract all information from your resume. Please complete the missing fields below:
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                  <Input
                    value={candidateData.name}
                    onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Email Address *</label>
                  <Input
                    type="email"
                    value={candidateData.email}
                    onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Phone Number *</label>
                  <Input
                    type="tel"
                    value={candidateData.phone}
                    onChange={(e) => setCandidateData({ ...candidateData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <Button 
                onClick={handleManualSubmit} 
                className="w-full h-12 text-lg bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg"
              >
                Continue to Interview →
              </Button>
            </div>
          )}

          {uploadComplete && (
            <div className="flex flex-col items-center gap-6 py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
              <div className="relative">
                <CheckCircle className="h-24 w-24 text-green-500" />
                <div className="absolute inset-0 h-24 w-24 bg-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800 mb-2">Resume Uploaded Successfully!</p>
                <p className="text-gray-600">Preparing your personalized interview experience...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

