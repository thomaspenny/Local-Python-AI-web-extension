#!/usr/bin/env python
"""
Launcher script for the Local AI Webpage Analyzer server.
Run this from the root directory: python run_server.py
"""
import sys
import os
import uvicorn

# Add server directory to path
server_dir = os.path.join(os.path.dirname(__file__), 'server')
sys.path.insert(0, server_dir)

if __name__ == "__main__":
    from app import app
    
    print("Starting Local AI Webpage Analyzer Server...")
    print("Server will run at http://127.0.0.1:8000")
    print("Press Ctrl+C to stop the server")
    
    uvicorn.run(app, host="127.0.0.1", port=8000)
