# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
FastAPI app for the playground dashboard agent.
Uses ADK get_fast_api_app(). Run with: uv run uvicorn main:app --host 0.0.0.0 --port 8081
Or: uv run adk web / uv run adk run dashboard_agent
"""

import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

load_dotenv()

# Resolve agent directory so ADK's list_agents() (which uses Path.cwd() / agents_dir) works
# no matter where the server is started from.
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(AGENT_DIR)

session_uri = os.getenv("SESSION_SERVICE_URI", None)
web_interface_enabled = os.getenv("SERVE_WEB_INTERFACE", "False").lower() in ("true", "1")

app_args = {"agents_dir": AGENT_DIR, "web": web_interface_enabled}
if session_uri:
    app_args["session_service_uri"] = session_uri

app: FastAPI = get_fast_api_app(**app_args)
app.title = "playground"
app.description = "Playground Dashboard Agent (query DB, charts, recommendations)"

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8081")))
