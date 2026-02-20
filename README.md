Adaptive Revision Planner
Capacity-Aware AI Study System

An AI-powered intelligent revision planning system that generates personalized, performance-driven study schedules based on subject marks, syllabus weightage, exam timelines, and available study hours.

Powered by the Google Gemini API, this system dynamically adapts schedules based on updated performance inputs, helping students study smarter—not longer.
🚀 Overview

Adaptive Revision Planner transforms traditional static timetables into intelligent, adaptive academic roadmaps.

Instead of equally dividing study hours, the system:

    Identifies strengths and weaknesses

    Prioritizes high-weightage topics

    Allocates time based on performance gaps

    Adjusts schedules after mock tests

    Prevents burnout with capacity-aware planning

🎯 Problem Statement

Students struggle with effective revision because:

    They don’t know what to prioritize

    They follow rigid timetables

    Their schedules don’t adapt after mock tests

    They underestimate subject weightage

    They experience exam stress due to poor planning

There is no intelligent system that continuously adapts study strategies based on performance.
💡 Our Solution

Adaptive Revision Planner uses AI reasoning to:

    Analyze subject-wise marks

    Evaluate syllabus weightage

    Consider exam deadlines

    Understand available daily study capacity

    Generate a structured day-by-day revision plan

    Dynamically update the plan when new scores are added

It functions like a personal AI academic coach.
🧠 How It Works

    User inputs:

        Subject marks

        Syllabus weightage

        Exam date

        Daily study hours

    Backend structures the data.

    Data is sent securely to Google Gemini API.

    AI generates:

        Priority scores

        Subject focus distribution

        Daily revision breakdown

    Updated mock scores trigger schedule recalculation.

🏗️ System Architecture
Frontend

    React.js / Flutter

    Dashboard & Calendar View

    Performance Analytics

Backend

    Node.js / Django

    API Controller

    Prompt Engineering Layer

    Scheduling Logic

AI Layer

    Google Gemini API

    Contextual reasoning engine

    Adaptive schedule generation

Database

    MongoDB / PostgreSQL

    User data storage

    Performance history

✨ Key Features

    📊 Performance-based subject prioritization

    🗓️ AI-generated day-wise schedule

    🔁 Dynamic rescheduling after mock tests

    ⏳ Capacity-aware time allocation

    📈 Progress tracking dashboard

    📱 Cross-platform (Web, Android, iOS)

    🌐 Lightweight & 4G/5G optimized

🛠️ Tech Stack
Layer	Technology
Frontend	React.js / Flutter
Backend	Node.js / Django
AI	Google Gemini API
Database	MongoDB / PostgreSQL
Cloud	AWS / Firebase
📦 Installation
1️⃣ Clone the repository

git clone https://github.com/your-username/adaptive-revision-planner.git
cd adaptive-revision-planner

2️⃣ Install dependencies

npm install

3️⃣ Setup environment variables

Create a .env file in the root directory:

GEMINI_API_KEY=your_google_gemini_api_key
DATABASE_URL=your_database_url
PORT=5000

4️⃣ Run the development server

npm run dev

🔐 Environment Variables
Variable	Description
GEMINI_API_KEY	Google Gemini API Key
DATABASE_URL	Database connection string
PORT	Backend server port
📊 Use Cases

    Board exam students

    Competitive exam aspirants

    College students

    Coaching institutes

    EdTech platforms

🔮 Future Enhancements

    LMS integration

    Gamification system

    Peer performance comparison

    AI-based doubt prediction

    Voice-based AI assistant

    Multilingual support

    Emotional burnout detection

🌍 Impact

    Improves academic efficiency

    Reduces exam stress

    Enables smart revision

    Encourages data-driven study decisions

    Makes AI-powered education accessible

🏆 Hackathon Value

    Solves a real-world student problem

    AI-first architecture

    Scalable and deployable

    Strong social impact

    Market-ready potential

📜 License

This project is developed for hackathon and educational purposes.
Future licensing terms can be defined for production deployment.
