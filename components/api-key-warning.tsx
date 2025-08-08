import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export function ApiKeyWarning() {
  return (
    <Alert className="border-blue-200 bg-blue-50">
      <AlertTriangle className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Setup Required:</strong> This application requires a Google AI Studio API key to generate worksheets. 
        Please add your <code className="bg-blue-100 px-1 rounded">GOOGLE_GENERATIVE_AI_API_KEY</code> environment variable.
        <br />
        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:no-underline mt-1 inline-block"
        >
          Get your API key from Google AI Studio →
        </a>
      </AlertDescription>
    </Alert>
  )
}
