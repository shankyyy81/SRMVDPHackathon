# Product Management System

This repository contains the Product Management System developed for the SDG Hackathon.

## Structure
- `frontend/`: React + Vite frontend application
- `backend/`: FastAPI Python backend application

## Setup and Running the Project
Link to ML model : https://drive.google.com/file/d/1y5oHhs_vGWaJ8zoZKRJNONlZQJ7n3t_t/view?usp=sharing

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # On macOS/Linux:
   python3 -m venv .venv
   source .venv/bin/activate
   
   # On Windows:
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   > The server will start at `http://127.0.0.1:8000`.

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   > The app will be available at `http://localhost:5173`.

## Features
- Role-based Access Control (Faculty, Student)
- Project creation and tracking
- SDG ML Analysis integration

## Technology Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, Python, PyTorch, Transformers
