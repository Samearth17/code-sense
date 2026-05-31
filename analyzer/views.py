import json
import re
import requests as http_requests

from rest_framework.decorators import api_view
from rest_framework.response import Response
from openai import OpenAI
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=settings.NVIDIA_API_KEY,
)

MODEL = "meta/llama-3.3-70b-instruct"

# Supported code file extensions and their language names
SUPPORTED_EXTENSIONS = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.go': 'go',
    '.rb': 'ruby',
    '.rs': 'rust',
    '.php': 'php',
}

MAX_GITHUB_FILES = 20


# ═══════════════════════════════════════════════════════════════════════════
# Helper utilities
# ═══════════════════════════════════════════════════════════════════════════

def _parse_json_response(text: str) -> dict | None:
    """Try hard to extract valid JSON from model output.

    Strategy:
      1. Direct json.loads on the whole string.
      2. Regex for ```json ... ``` fenced blocks.
      3. Regex for the first top-level { ... } object.
    """
    # 1. Direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # 2. Fenced JSON block
    m = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # 3. First { ... } blob (greedy, outermost braces)
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass

    return None


def _call_ai(system_prompt: str, user_prompt: str) -> str:
    """Send a system+user message pair to the AI and return the raw text."""
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1024,
    )
    return completion.choices[0].message.content


# ═══════════════════════════════════════════════════════════════════════════
# 1. Analyze Code
# ═══════════════════════════════════════════════════════════════════════════

ANALYZE_SYSTEM_PROMPT = (
    "You are a code analysis assistant. You MUST respond with valid JSON only, "
    "no markdown, no extra text. The JSON must have these exact keys: "
    "bugs_found (array of objects with line, bug, severity), "
    "explanation (string), fixed_code (string)."
)


@csrf_exempt
@api_view(['POST'])
def analyze_code(request):
    """Analyze a snippet of code for bugs and return structured JSON."""
    code = request.data.get('code', '')
    language = request.data.get('language', 'python')

    if not code:
        return Response({'error': 'No code provided'}, status=400)

    user_prompt = (
        f"Analyze this {language} code for bugs and errors. "
        f"Return your analysis as JSON.\n\nCode:\n{code}"
    )

    try:
        raw = _call_ai(ANALYZE_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        return Response({'error': f'AI service error: {str(e)}'}, status=500)

    parsed = _parse_json_response(raw)
    if parsed is None:
        # Fallback: wrap the raw text into the expected shape
        parsed = {
            'bugs_found': [],
            'explanation': raw,
            'fixed_code': code,
        }

    return Response({
        'bugs_found': parsed.get('bugs_found', []),
        'explanation': parsed.get('explanation', ''),
        'fixed_code': parsed.get('fixed_code', code),
        'language': language,
    })


# ═══════════════════════════════════════════════════════════════════════════
# 2. Upload File
# ═══════════════════════════════════════════════════════════════════════════

def _detect_language(filename: str) -> str | None:
    """Return language name from filename extension, or None."""
    for ext, lang in SUPPORTED_EXTENSIONS.items():
        if filename.endswith(ext):
            return lang
    return None


@csrf_exempt
@api_view(['POST'])
def upload_file(request):
    """Accept a code file upload, analyse it, and return structured JSON."""
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=400)

    uploaded = request.FILES['file']
    filename = uploaded.name

    language = _detect_language(filename)
    if language is None:
        allowed = ', '.join(SUPPORTED_EXTENSIONS.keys())
        return Response(
            {'error': f'Unsupported file type. Allowed extensions: {allowed}'},
            status=400,
        )

    try:
        code = uploaded.read().decode('utf-8')
    except UnicodeDecodeError:
        return Response({'error': 'File is not valid UTF-8 text'}, status=400)

    user_prompt = (
        f"Analyze this {language} code for bugs and errors. "
        f"Return your analysis as JSON.\n\nCode:\n{code}"
    )

    try:
        raw = _call_ai(ANALYZE_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        return Response({'error': f'AI service error: {str(e)}'}, status=500)

    parsed = _parse_json_response(raw)
    if parsed is None:
        parsed = {
            'bugs_found': [],
            'explanation': raw,
            'fixed_code': code,
        }

    return Response({
        'filename': filename,
        'language': language,
        'bugs_found': parsed.get('bugs_found', []),
        'explanation': parsed.get('explanation', ''),
        'fixed_code': parsed.get('fixed_code', code),
    })


# ═══════════════════════════════════════════════════════════════════════════
# 3. Analyze GitHub Repository
# ═══════════════════════════════════════════════════════════════════════════

def _parse_github_url(url: str):
    """Extract (owner, repo) from a GitHub URL."""
    url = url.rstrip('/')
    # Handle https://github.com/owner/repo or github.com/owner/repo
    m = re.search(r'github\.com/([^/]+)/([^/]+)', url)
    if m:
        return m.group(1), m.group(2).replace('.git', '')
    return None, None


def _fetch_repo_tree(owner: str, repo: str):
    """Return (branch, tree_items) trying 'main' then 'master'."""
    for branch in ('main', 'master'):
        api_url = (
            f"https://api.github.com/repos/{owner}/{repo}"
            f"/git/trees/{branch}?recursive=1"
        )
        resp = http_requests.get(api_url, timeout=15)
        if resp.status_code == 200:
            return branch, resp.json().get('tree', [])
    return None, None


@csrf_exempt
@api_view(['POST'])
def analyze_github(request):
    """Analyse code files from a public GitHub repository."""
    repo_url = request.data.get('repo_url', '')
    if not repo_url:
        return Response({'error': 'No repo_url provided'}, status=400)

    owner, repo = _parse_github_url(repo_url)
    if not owner or not repo:
        return Response({'error': 'Invalid GitHub URL'}, status=400)

    branch, tree = _fetch_repo_tree(owner, repo)
    if tree is None:
        return Response(
            {'error': 'Repository not found or branch main/master missing'},
            status=404,
        )

    # Filter to supported code files only
    code_files = [
        item for item in tree
        if item.get('type') == 'blob'
        and any(item['path'].endswith(ext) for ext in SUPPORTED_EXTENSIONS)
    ][:MAX_GITHUB_FILES]

    results = []
    for item in code_files:
        path = item['path']
        raw_url = (
            f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
        )
        try:
            file_resp = http_requests.get(raw_url, timeout=15)
            if file_resp.status_code != 200:
                results.append({
                    'file': path,
                    'error': f'Failed to fetch file (HTTP {file_resp.status_code})',
                })
                continue

            code = file_resp.text
            language = _detect_language(path)

            user_prompt = (
                f"Analyze this {language} code for bugs and errors. "
                f"Return your analysis as JSON.\n\nCode:\n{code}"
            )

            raw = _call_ai(ANALYZE_SYSTEM_PROMPT, user_prompt)
            parsed = _parse_json_response(raw)
            if parsed is None:
                parsed = {
                    'bugs_found': [],
                    'explanation': raw,
                    'fixed_code': code,
                }

            results.append({
                'file': path,
                'bugs_found': parsed.get('bugs_found', []),
                'explanation': parsed.get('explanation', ''),
                'fixed_code': parsed.get('fixed_code', code),
            })

        except http_requests.RequestException as e:
            results.append({'file': path, 'error': str(e)})
        except Exception as e:
            results.append({'file': path, 'error': f'AI error: {str(e)}'})

    return Response({
        'repo': f'{owner}/{repo}',
        'total_files': len(code_files),
        'results': results,
    })


# ═══════════════════════════════════════════════════════════════════════════
# 4. Detect AI-Generated Code
# ═══════════════════════════════════════════════════════════════════════════

DETECT_AI_SYSTEM_PROMPT = (
    "You are an AI code detection expert. Analyze the given code and determine "
    "if it was written by an AI or a human. Respond with valid JSON only, no "
    "markdown, no extra text. The JSON must have these exact keys: "
    'verdict (string, either "AI-Generated" or "Human-Written"), '
    "confidence (number 0-100), reasoning (string), "
    "indicators (array of objects with pattern and suggests where suggests is "
    '"AI" or "Human").'
)


@csrf_exempt
@api_view(['POST'])
def detect_ai_code(request):
    """Determine whether a code snippet was AI-generated or human-written."""
    code = request.data.get('code', '')
    language = request.data.get('language', 'python')

    if not code:
        return Response({'error': 'No code provided'}, status=400)

    user_prompt = (
        f"Analyze this {language} code and determine if it was written by "
        f"an AI or a human.\n\nCode:\n{code}"
    )

    try:
        raw = _call_ai(DETECT_AI_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        return Response({'error': f'AI service error: {str(e)}'}, status=500)

    parsed = _parse_json_response(raw)
    if parsed is None:
        parsed = {
            'verdict': 'Unknown',
            'confidence': 0,
            'reasoning': raw,
            'indicators': [],
        }

    return Response({
        'verdict': parsed.get('verdict', 'Unknown'),
        'confidence': parsed.get('confidence', 0),
        'reasoning': parsed.get('reasoning', ''),
        'indicators': parsed.get('indicators', []),
        'language': language,
    })