# Intelligent Dataset Management Platform

## Project Overview
A full-stack web application for automatic dataset error detection, rectification, and visualization.

## Tech Stack
- **Frontend**: React (Vite), Bootstrap 5, Chart.js
- **Backend**: Python (Flask), Pandas, Scikit-Learn
- **Database**: PostgreSQL (Metadata), File System (Datasets)

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL installed and running

### 1. Backend Setup
1. Navigate to `backend` folder:
   ```bash
   cd backend
   ```
2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Database:
   - Ensure PostgreSQL is running.
   - Create a database named `dataset_platform`.
   - Update `config.py` typically via environment variable `DATABASE_URL`.
   - Example: `set DATABASE_URL=postgresql://user:pass@localhost:5432/dataset_platform`
5. Run the server:
   ```bash
   python app.py
   ```

### 2. Frontend Setup
1. Navigate to `frontend` folder:
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

### 3. Usage
- Open `http://localhost:5173` in your browser.
- Register a new account.
- Upload a CSV/Excel file.
- View analysis and apply cleaning.
