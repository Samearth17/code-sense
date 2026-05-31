# AI Code Rectifier 🚀

AI Code Rectifier is a premium, dark-mode web application that detects bugs in your code, explains them in plain English, and provides corrected/rectified versions in real-time. It also includes advanced capabilities like GitHub repository scanning and an AI vs Human code origin detector.

---

## 🌟 Core Features

1. **Code Analysis Engine**
   - Paste code snippets, select the language, and get a list of bugs with severity, a line-by-line explanation, and rectified code in seconds.

2. **Clean Glassmorphism Web UI**
   - Premium, responsive dark-themed dashboard built with vanilla HTML/CSS/JS.
   - Real-time line numbers, split results view, and one-click copy to clipboard.

3. **File Upload Mode**
   - Drag & drop or browse code files directly (`.py`, `.js`, `.ts`, `.java`, etc.) to trigger analysis.

4. **GitHub Repo Analyzer**
   - Scan public repositories recursively (up to 20 files) for bugs across the codebase.

5. **AI vs Human Code Detector**
   - Predict whether code was written by an AI assistant or a human, complete with confidence scores and reasoning indicators.

---

## 🛠️ Stack

- **Backend**: Django, Django REST Framework, django-cors-headers, Requests
- **AI Integration**: NVIDIA API (`meta/llama-3.3-70b-instruct` model)
- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables, Shimmer Animations, Glassmorphism, Flex/Grid), Vanilla JS

---

## 🚀 Local Setup

1. **Clone & enter project**
   ```bash
   git clone <repo-url>
   cd ai-code-rectifier
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   NVIDIA_API_KEY=your_nvidia_api_key_here
   ```

5. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

6. **Start Dev Server**
   ```bash
   python manage.py runserver
   ```
   Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

---

## 📡 API Endpoints

All endpoints are prefix-based under `/api/` and accept/return JSON.

| Route | Method | Payload | Response |
|---|---|---|---|
| `/api/analyze/` | `POST` | `{"code": "...", "language": "..."}` | `{"bugs_found": [], "explanation": "...", "fixed_code": "..."}` |
| `/api/upload/` | `POST` | `FormData` with `"file"` | `{"filename": "...", "bugs_found": [], "explanation": "...", "fixed_code": "..."}` |
| `/api/github/` | `POST` | `{"repo_url": "..."}` | `{"repo": "...", "total_files": N, "results": [...]}` |
| `/api/detect/` | `POST` | `{"code": "...", "language": "..."}` | `{"verdict": "...", "confidence": 0-100, "reasoning": "..."}` |

---

## ☁️ Deployment

### Deploy to Render or Railway

1. **Ensure requirements.txt** has `gunicorn` (already added).
2. **Procfile** is included in the project root:
   ```yaml
   web: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
   ```
3. Set your **Environment Variables** in the hosting dashboard:
   - `NVIDIA_API_KEY`: Your Nvidia API credentials.
   - `PYTHON_VERSION`: `3.13` (or your preferred version).
4. Deploy the repository!
