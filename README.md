# ClassPlan – AI Worksheet Generator

A **Next.js API route** that generates differentiated, printable student worksheets using **Google’s Gemini API** (Generative Language API).  
It takes structured lesson inputs (curriculum, subject, objectives, etc.) and produces a complete Markdown worksheet that can be exported to PDF.

---

## ✨ Features

- **Powered by Google Gemini** (`gemini-1.5-flash` model via @google/generative-ai)
- Structured prompt design to ensure consistent worksheet formatting
- Generates:
  - Support, Core, and Extension activities
  - Answer keys for all questions
  - Optional teacher notes and rubrics
- Soft page limit and clean Markdown output for easy PDF export
- Simple built-in **rate limiting** (per IP per minute)

---

## 📂 Project Structure (Relevant to API Route)

route.ts              # Main API endpoint for worksheet generation
/lib/ai-config.ts     # Helper to initialize AI client (not shown here)

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** ≥ 18
- **Next.js** 13+ (app router)
- A Google Cloud project with the  
  [Generative Language API](https://console.cloud.google.com/marketplace/product/google/generativelanguage.googleapis.com) enabled
- A valid **Google API Key** with access to Gemini models

---

### 2. Setting Up Google Gemini API

#### Step 1 – Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** → **New Project**.
3. Give your project a name (e.g., `classworksheets`) and click **Create**.

#### Step 2 – Enable the Gemini API
1. In the GCP console, search for **"Gemini API"** or  
   [Generative Language API](https://console.cloud.google.com/marketplace/product/google/generativelanguage.googleapis.com).
2. Select it and click **Enable** for your newly created project.

#### Step 3 – Create an API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** → **Create API key in Google Cloud project**.
3. Select the project you just created.
4. Copy the API key — this will be your `GOOGLE_API_KEY`.

---

### 3. Clone and Install the Project

```bash
# Clone the repository
git clone https://github.com/saltpioneer/worksheet-maker

# Enter the project folder
cd worksheet-maker

# Install dependencies
npm install


⸻

4. Environment Variables

Create a .env.local file in your project root:

GOOGLE_API_KEY=your_google_api_key_here

🔐 Important: Never commit API keys to source control.

⸻

5. Run the Development Server

npm run dev

The app will be available at:

http://localhost:3000


⸻

6. API Route

This project defines a POST endpoint at:

/api/worksheet

Example Request

{
  "curriculum": "Common Core",
  "subject": "Mathematics",
  "grade": "Grade 5",
  "topic": "Fractions",
  "objectives": ["Add fractions with unlike denominators", "Simplify fractions"],
  "duration": "45 minutes",
  "support_level_desc": "Simple guided examples",
  "core_level_desc": "Standard grade-level problems",
  "extension_level_desc": "Challenging multi-step problems",
  "n_support": 3,
  "n_core": 5,
  "n_extension": 2,
  "constraints": "No calculators",
  "materials": "Paper, pencils",
  "include_teacher_notes": true,
  "include_rubric": false,
  "page_size": "A4",
  "max_pages": 3
}


⸻

7. Response

Returns JSON containing a markdown field with the generated worksheet:

{
  "markdown": "# Mathematics — Fractions (Grade 5)\n\n**Aligned to:** Common Core\n..."
}

You can then render this Markdown as HTML or export it to PDF.

⸻

⚙️ Rate Limiting
	•	The endpoint includes a simple in-memory rate limiter:
	•	Max: 10 requests per IP per minute
	•	For production, replace with Redis or another persistent store.

⸻

🛠 Development Notes
	•	Validation is handled with Zod to ensure structured input
	•	The AI prompt is carefully crafted for consistent, printer-friendly output
	•	API errors are handled gracefully (invalid inputs, quota limits, blocked content, etc.)

⸻

📜 License

This project is licensed under the MIT License.

⸻

📡 References
	•	Google Generative AI Node.js SDK
	•	Generative Language API Docs
	•	Next.js API Routes
