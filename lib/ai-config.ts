import { google } from '@ai-sdk/google'

// Configure Google AI client with proper error handling
export const getGoogleAIClient = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  
  if (!apiKey) {
    throw new Error('Google AI API key is missing. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable.')
  }
  
  return google({
    apiKey: apiKey,
  })
}
