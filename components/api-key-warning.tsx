import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {AlertTriangle} from 'lucide-react'

export function ApiKeyWarning() {
    return (
        <div className="grid w-full max-w-xl items-start gap-4">
    <Alert className="border-blue-200 bg-blue-50">
      <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Setup Required if running locally</AlertTitle>
      <AlertDescription className="text-blue-800">
          This application requires a Google AI Studio API key to generate worksheets.{' '}
          <span className="whitespace-nowrap">
          Please add your <code className="bg-blue-100 px-1 rounded">GOOGLE_API_KEY</code> environment variable.
        </span>

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
        </div>
  )
}
