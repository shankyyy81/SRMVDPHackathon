# Product Management System

This repository contains the Product Management System developed for the SDG Hackathon.

## Structure
- `frontend/`: React + Vite frontend application
- `backend/`: FastAPI Python backend application

## Setup

### Backend
1. Navigate to the `backend` directory.
2. Create and activate a virtual environment.
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `uvicorn main:app --reload`

### Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## Features
- Role-based Access Control (Faculty, Student)
- Project creation and tracking
- SDG ML Analysis integration

## Technology Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, Python, PyTorch, Transformers
