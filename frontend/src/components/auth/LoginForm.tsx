import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Mail, Lock, Wallet } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Link, useNavigate } from 'react-router-dom'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const { login, loginWithWallet } = useAuthStore()
  const navigate = useNavigate()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})
    
    try {
      await login(formData.email, formData.password)
      navigate('/dashboard')
    } catch (error) {
      setErrors({ general: 'Invalid email or password' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleOAuthLogin = async (provider: 'github') => {
    setIsLoading(true)
    setErrors({})
    
    try {
      // TODO: Implement OAuth login
      console.log(`OAuth login with ${provider}`)
      // Redirect to OAuth provider
      window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/${provider}`
    } catch (error) {
      setErrors({ general: `${provider} login failed` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletConnect = async () => {
    setIsLoading(true)
    setErrors({})
    
    try {
      // TODO: Implement wallet connection
      const solanaWallet = (window as any).solana
      if (solanaWallet) {
        const response = await solanaWallet.connect()
        const walletAddress = response.publicKey.toString()
        
        // Create a message to sign
        const message = `Sign this message to authenticate with MEV Analytics: ${Date.now()}`
        const encodedMessage = new TextEncoder().encode(message)
        
        // Sign the message
        const signedMessage = await solanaWallet.signMessage(encodedMessage, 'utf8')
        const signature = Array.from(signedMessage.signature as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
        
        await loginWithWallet(walletAddress, signature, message)
        navigate('/dashboard')
      } else {
        setErrors({ general: 'Solana wallet not found. Please install Phantom or another Solana wallet.' })
      }
    } catch (error) {
      setErrors({ general: 'Wallet connection failed' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your MEV Analytics account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* General Error Message */}
          {errors.general && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {errors.general}
            </div>
          )}

          {/* OAuth & Wallet Buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleWalletConnect}
              disabled={isLoading}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  className={`input pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
              />
              <label htmlFor="rememberMe" className="text-sm text-muted-foreground">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Signup Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary hover:underline">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}