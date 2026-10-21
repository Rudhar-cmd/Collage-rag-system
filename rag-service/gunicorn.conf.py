import os

# Keep one process to fit Render's free memory tier, while allowing health
# checks and concurrent requests during an external Groq API call.
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
worker_class = "gthread"
workers = 1
threads = 4
timeout = 60
graceful_timeout = 30
keepalive = 2
