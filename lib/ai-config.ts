import { GoogleGenerativeAI } from '@google/generative-ai';

export const getGoogleAIClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google AI API key is missing. Please set GOOGLE_API_KEY environment variable.');
  }

  return new GoogleGenerativeAI(apiKey);
};