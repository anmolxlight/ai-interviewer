import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelectedRole } from '@/store/slices/candidateSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Briefcase, Code, Palette, Database, Shield, Cloud, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react'

interface RoleSelectionProps {
  onComplete: () => void
  onBack: () => void
}

const POPULAR_ROLES = [
  { name: 'Software Engineer', icon: Code, description: 'Full-stack development' },
  { name: 'Frontend Developer', icon: Palette, description: 'UI/UX focused' },
  { name: 'Backend Developer', icon: Database, description: 'Server-side engineering' },
  { name: 'DevOps Engineer', icon: Cloud, description: 'Infrastructure & automation' },
  { name: 'Data Scientist', icon: Sparkles, description: 'ML & Analytics' },
  { name: 'Security Engineer', icon: Shield, description: 'Cybersecurity' },
]

export function RoleSelection({ onComplete, onBack }: RoleSelectionProps) {
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
    if (!finalRole.trim()) return
    dispatch(setSelectedRole(finalRole))
    onComplete()
  }

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />

      <div className="w-full max-w-4xl relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">Select Your Role</CardTitle>
                <CardDescription>We'll tailor questions to match your experience</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Popular Roles</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {POPULAR_ROLES.map((role) => {
                  const Icon = role.icon
                  const isSelected = selectedRole === role.name && !isCustom
                  return (
                    <button
                      key={role.name}
                      onClick={() => handleRoleSelect(role.name)}
                      className={`p-4 rounded-xl text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary/50 glow-cyan'
                          : 'bg-secondary/50 border-2 border-transparent hover:border-border hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm">{role.name}</h4>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Or Enter Custom Role</p>
              <Input
                value={customRole}
                onChange={(e) => {
                  setCustomRole(e.target.value)
                  if (e.target.value.trim()) {
                    setIsCustom(true)
                    setRole('')
                  } else {
                    setIsCustom(false)
                  }
                }}
                placeholder="e.g., Mobile App Developer, AI Engineer..."
                className="h-11 bg-secondary/50"
              />
              {isCustom && customRole && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">Custom: {customRole}</Badge>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                {(selectedRole || customRole) ? (
                  <>Selected: <span className="font-semibold text-primary">{isCustom ? customRole : selectedRole}</span></>
                ) : 'No role selected'}
              </p>
              <Button
                onClick={handleContinue}
                disabled={!selectedRole && !customRole.trim()}
                className="gap-2"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
