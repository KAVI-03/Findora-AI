# 🔍 Findora – Deep Multimodal Learning for Intelligent Lost Item Retrieval

<p align="center">
  <b>Find What's Lost. Return What's Found.</b>
</p>

<p align="center">
  An AI-powered platform designed to make campus lost-and-found management smarter, faster, and more efficient.
</p>

---

## 📌 About the Project

**Findora** is an intelligent campus Lost & Found platform developed to simplify the process of reporting, searching for, and recovering lost belongings within colleges and universities.

In traditional campus environments, finding lost items often depends on notice boards, emails, manual enquiries, or announcements. These methods can make it difficult to identify matching items quickly.

Findora addresses this challenge by integrating Artificial Intelligence, image recognition, natural-language search, and a centralized management system. Users can search for missing belongings using an image or a text description, while campus security staff can manage found items and assist with claim verification.

The platform provides separate workflows for students, security guards, and administrators, creating a more organized and accessible lost-and-found experience.

## 🎯 Problem Statement

Students frequently lose personal belongings such as:

- Mobile phones and electronic devices
- Wallets, ID cards, and keys
- Water bottles and lunch boxes
- Bags, books, and stationery
- Earphones, chargers, and other accessories

Traditional lost-and-found systems have several limitations:

- **Manual searching:** Students must enquire with different departments or security desks.
- **Limited communication:** Lost-item announcements may not reach the right person.
- **Description mismatch:** People may describe the same item using different words.
- **Time-consuming recovery:** Finding the correct item can require repeated enquiries.
- **Unorganized records:** Manually maintained reports can become difficult to track.

## 💡 Proposed Solution

Findora introduces an AI-assisted search and management system that connects lost-item reports with found-item records.

Instead of relying only on keywords, users can search using images or natural-language descriptions. The AI model generates feature representations, and a vector search engine retrieves visually or semantically similar items.

The platform also supports item reporting, role-based access, chatbot assistance, and organized claim-management workflows.

## ✨ Key Features

### 1. 📸 AI-Powered Image Search

Users can upload an image of a missing belonging to search for visually similar items. The system processes the image using a vision-language model and retrieves candidate matches from the available item records.

### 2. 🔎 Natural-Language Text Search

Users can describe an item in their own words instead of entering only exact keywords.

**Example queries:**
- Black wireless earbuds with a red case
- Blue water bottle
- Brown wallet with an ID card

The search system uses text embeddings and similarity matching to identify relevant results.

### 3. 🤖 Intelligent Campus Chatbot

The integrated chatbot helps users interact with the lost-and-found system through conversational queries. It supports English and common Tanglish expressions, making the search experience more accessible.

**Example:** “Enoda phone kedaichucha?”

The chatbot can assist with relevant item queries based on the system's available records.

### 4. 🎯 Similarity-Based Matching

The platform uses AI-generated embeddings and FAISS vector search to retrieve and rank potentially matching items.

Results can be presented with confidence categories such as High, Medium, and Low, depending on the application's scoring logic.

### 5. 👨‍🎓 Student Portal

Students can use the platform to:

- Search for lost belongings.
- Report lost items.
- Report found items.
- View available item information.
- Check claim-related information where supported.

### 6. 🛡️ Security Guard Portal

The security interface supports organized handling of recovered belongings.

Security staff can record items handed in at security desks, review claims, verify the claimant's identity, and coordinate physical handovers according to the implemented workflow.

### 7. ⚙️ Admin Dashboard

The administrator interface supports system-level management, including user and item management, review of system activity, and maintenance of the vector search index.

### 8. 🎨 Responsive User Interface

The application uses a modern React-based interface with custom CSS. It includes responsive layouts and dark/light theme support for a more comfortable user experience.

### 9. ☁️ Optional Cloud Synchronization

The system supports optional integration with Hugging Face Hub for dataset backup and synchronization, alongside local database storage.

---

## 🧠 AI and Machine Learning

Findora's core search functionality uses a vision-language model to represent images and text descriptions in a shared embedding space.

### AI Model

**Model:** `google/siglip2-base-patch16-224`

SigLIP 2 is used to generate representations of images and text so that the system can compare user queries with reported items.

### Vector Similarity Search

**Technology:** FAISS

FAISS is used to search through item embeddings and retrieve similar candidates efficiently.

### AI Search Workflow

1. The user submits an image or a text description.
2. The input is processed by the corresponding model encoder.
3. The system generates an embedding representation.
4. FAISS compares the query embedding against indexed item embeddings.
5. Candidate matches are ranked by similarity.
6. The application displays the most relevant available results.

### Benefits of the AI Approach

- Supports both image and text-based queries.
- Reduces dependence on exact keyword matches.
- Helps identify potentially similar item descriptions.
- Enables ranked retrieval from a collection of reported items.
- Provides a foundation for more intelligent campus search.

*Note: Search quality depends on the available item data, image quality, model configuration, and similarity thresholds.*

## 🏗️ System Architecture

The system consists of a frontend application, a backend API, an AI retrieval pipeline, and a database.

```text
              USER
               |
               v
       React + Vite Frontend
               |
               v
        FastAPI Backend
               |
       +-------+--------+
       |       |        |
       v       v        v
    SigLIP 2  SQLite   Chatbot
       |
       v
   Image/Text
   Embeddings
       |
       v
   FAISS Search
       |
       v
 Ranked Results
       |
       v
   Frontend UI
```

### Architecture Components

- **Frontend:** Provides the user interface and role-specific pages.
- **Backend:** Handles API requests, authentication, search, and item management.
- **AI engine:** Generates image and text embeddings.
- **Vector search:** Retrieves similar items using FAISS.
- **Database:** Stores application data such as user and item records.
- **Optional cloud storage:** Supports dataset synchronization through Hugging Face Hub.

## 👥 User Roles

| Role | Responsibilities |
|---|---|
| Student | Search for belongings, report lost items, and report found items. |
| Security Guard | Record recovered items, review claims, and coordinate handovers. |
| Administrator | Manage users and records, review system activity, and maintain search indexing. |

## 🛠️ Technology Stack

### Frontend
- React 19
- Vite
- React Router DOM
- HTML and CSS

### Backend
- Python 3.10+
- FastAPI
- Uvicorn
- SQLite

### Artificial Intelligence
- SigLIP 2
- PyTorch
- Hugging Face Transformers
- Pillow

### Vector Search
- FAISS CPU

### Security and Infrastructure
- JWT-based authentication
- Password hashing
- Docker
- Hugging Face Hub integration

## 📂 Project Structure

```text
Findora-AI/
├── campus-lost-found-main/
│   ├── backend/
│   │   ├── main.py
│   │   ├── matcher_siglip.py
│   │   ├── chatbot.py
│   │   ├── text_search.py
│   │   ├── database.py
│   │   ├── storage_manager.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── frontend/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── src/
│   │       ├── App.jsx
│   │       ├── api/
│   │       ├── components/
│   │       ├── context/
│   │       └── pages/
│   │
│   ├── dataset/
│   ├── Dockerfile
│   └── config.py
│
├── .gitignore
└── README.md
```

*Update the structure above if your actual repository uses different folder or file names.*

## 🚀 Installation and Setup

### Prerequisites

Make sure the following tools are installed:

- Python 3.10 or later
- Node.js and npm
- Git
- Visual Studio Code (recommended)

Docker is optional.

### Step 1: Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
```

Replace the placeholders with your actual GitHub repository URL and folder name.

### Step 2: Configure the Backend

Navigate to the backend folder:

```bash
cd campus-lost-found-main/backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it in Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required packages:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start the backend:

```bash
python main.py
```

If the configured server port is `7860`, the API documentation will generally be available at:

`http://localhost:7860/docs`

### Step 3: Configure the Frontend

Open a second terminal and navigate to the frontend directory:

```bash
cd campus-lost-found-main/frontend
```

Install the frontend dependencies:

```bash
npm install
```

If the project includes an `.env.example` file, copy it to `.env` and configure the backend API URL as needed.

Start the development server:

```bash
npm run dev
```

Open the local URL printed in the terminal. If the configured Vite port is `5173`, the address will generally be:

`http://localhost:5173`

### Step 4: Use the Application

Once the frontend and backend are running:

1. Open the application in your browser.
2. Register or sign in using the supported authentication flow.
3. Search using an image or text description.
4. Report lost or found belongings.
5. Use the appropriate staff interface for item management and claim handling.

*The exact screens and available actions depend on the features implemented in your version of the project.*

## 🐳 Docker Setup

If the project includes a working top-level Dockerfile and Docker is installed, build the image:

```bash
docker build -t findora-app .
```

Run the container:

```bash
docker run --rm -p 7860:7860 findora-app
```

Open the configured application endpoint in your browser. Verify the Docker configuration and exposed port if the application does not start as expected.

## 📡 API Reference

The backend documentation lists the following API routes. Check the running application's `/docs` page to verify request formats and authentication requirements.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a student account |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/me` | Retrieve the current user profile |
| POST | `/search-lost` | Search using image or text |
| POST | `/report-found` | Report a found item |
| POST | `/report-lost` | Report a lost item |
| GET | `/all-found` | Retrieve available found-item records |
| POST | `/api/chat` | Interact with the campus chatbot |
| POST | `/api/items/{filename}/status` | Update an item's status |
| DELETE | `/api/items/{filename}` | Delete an item with appropriate permissions |

## 🔐 Security Considerations

- Do not commit passwords, API keys, access tokens, or private credentials.
- Keep sensitive configuration in environment variables.
- Add `.env`, generated secrets, virtual environments, and unnecessary local database files to `.gitignore` where appropriate.
- Avoid publishing real user data or private item information.
- Review role-based permissions before deploying the application.
- Use test credentials only in controlled development environments.

## 🌟 Future Enhancements

Possible future improvements include:

- Email or in-app notifications when a likely match is found.
- More advanced duplicate-item detection.
- Improved multilingual search support.
- QR-based item identification.
- Analytics for campus administrators.
- Cloud deployment with secure authentication.
- Mobile-friendly enhancements and accessibility improvements.

These are potential enhancements and should not be considered implemented unless they are present in the codebase.

## 🎯 Project Outcome

Findora aims to make campus lost-and-found operations more organized and efficient by bringing AI-powered retrieval and item management into one platform.

By combining image search, natural-language queries, vector similarity matching, and role-based workflows, the project provides a practical application of Artificial Intelligence and full-stack web development to a real-world campus problem.

## 👩‍💻 Project Information

**Project Name:** Findora  
**Domain:** Deep Learning — Multimodal (Computer Vision & NLP) 
**Application:** Deep Multimodal Learning for Intelligent 
Lost Item Retrieval

Add the verified names of your project contributors and institution here.


<p align="center">
  <b>Findora — Making Lost & Found Smarter with AI. 💙</b>
</p>
