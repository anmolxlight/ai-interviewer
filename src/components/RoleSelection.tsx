import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelectedRole } from '@/store/slices/candidateSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Briefcase, Code, Palette, Database, Shield, Cloud, Sparkles, ChevronRight } from 'lucide-react'

interface RoleSelectionProps {
  onComplete: () => void
}

const POPULAR_ROLES = [
  { name: 'Software Engineer', icon: Code, color: 'bg-blue-500', description: 'Full-stack development' },
  { name: 'Frontend Developer', icon: Palette, color: 'bg-purple-500', description: 'UI/UX focused' },
  { name: 'Backend Developer', icon: Database, color: 'bg-green-500', description: 'Server-side engineering' },
  { name: 'DevOps Engineer', icon: Cloud, color: 'bg-orange-500', description: 'Infrastructure & automation' },
  { name: 'Data Scientist', icon: Sparkles, color: 'bg-pink-500', description: 'ML & Analytics' },
  { name: 'Security Engineer', icon: Shield, color: 'bg-red-500', description: 'Cybersecurity' },
]

export function RoleSelection({ onComplete }: RoleSelectionProps) {
  const dispatch = useDispatch()
  const [selectedRole, setRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  const handleRoleSelect = (role: string) => {
    setRole(role)
    setIsCustom(false)
    setCustomRole('')
  }

  const handleContinue = () => {
    const finalRole = isCustom ? customRole : selectedRole
    if (!finalRole.trim()) {
      alert('Please select or enter a role')
      return
    }
    dispatch(setSelectedRole(finalRole))
    onComplete()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4 animated-bg">
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animated-bg {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
        .role-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .role-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .role-card.selected {
          transform: scale(1.02);
          box-shadow: 0 20px 25px -5px rgba(139, 92, 246, 0.3), 0 10px 10px -5px rgba(139, 92, 246, 0.2);
        }
      `}</style>

      <Card className="w-full max-w-5xl shadow-2xl border-0">
        <CardHeader className="text-center pb-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center justify-center mb-4">
            <Briefcase className="h-12 w-12" />
          </div>
          <CardTitle className="text-4xl font-bold mb-2">What Role Are You Interviewing For?</CardTitle>
          <CardDescription className="text-violet-100 text-lg">
            Select a role or enter your own. We'll tailor questions to match your experience.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8 pb-8">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Popular Roles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {POPULAR_ROLES.map((role) => {
                const Icon = role.icon
                const isSelected = selectedRole === role.name && !isCustom
                return (
                  <div
                    key={role.name}
                    onClick={() => handleRoleSelect(role.name)}
                    className={`role-card cursor-pointer p-4 border-2 rounded-xl ${
                      isSelected ? 'selected border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${role.color} p-2.5 rounded-lg text-white flex-shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{role.name}</h4>
                        <p className="text-sm text-gray-500">{role.description}</p>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center">
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Or Enter Custom Role</h3>
            <div className="flex gap-3">
              <Input
                value={customRole}
                onChange={(e) => {
                  setCustomRole(e.target.value)
                  if (e.target.value.trim()) {
                    setIsCustom(true)
                    setRole('')
                  }
                }}
                placeholder="e.g., Mobile App Developer, AI Engineer, Product Manager..."
                className="flex-1 h-12 text-base"
              />
            </div>
            {isCustom && customRole && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1 px-3">
                  Custom Role: {customRole}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <p className="text-sm text-gray-500">
              {selectedRole || customRole ? (
                <>Selected: <span className="font-semibold text-violet-600">{isCustom ? customRole : selectedRole}</span></>
              ) : (
                'No role selected yet'
              )}
            </p>
            <Button
              onClick={handleContinue}
              disabled={!selectedRole && !customRole.trim()}
              size="lg"
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg"
            >
              Continue to Interview
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


