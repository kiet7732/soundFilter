# soundFilter AI - AI-Powered Audio Separation

System built with React and FastAPI, using state-of-the-art AI models (Demucs, AudioSep) to separate audio sources from a single track.

## Key Features

-   **Two Audio Separation Modes:**
    -   **Music Mode:** Uses the **Demucs** model to separate a song into its individual components: `Vocals`, `Bass`, `Drums`, and `Other`. Automatically generates a `Beat` track (instrumental) for karaoke.
    -   **Environment Mode:** Uses the **AudioSep** model combined with **CLAP** to automatically detect and separate various sounds in a mixed environment (e.g., speech, vehicle noise, rain, wind...).
-   **Interactive Web Interface:**
    -   Playback for original and separated tracks.
    -   Exclusive audio player (only one track plays at a time for easy comparison).
    -   Download individual tracks or all tracks as a `.zip` file.
    -   The interface automatically updates to display sounds detected by the AI in Environment Mode.
-   **Karaoke Features (In Development):**
    -   UI for a Lyric Editor.
    -   UI for a Karaoke Video Rendering Engine.

## Technologies Used

| Component    | Technology                                                                                            |
| :----------- | :---------------------------------------------------------------------------------------------------- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Lucide React, Axios, JSZip, File-saver                         |
| **Backend**  | Python, FastAPI, Uvicorn, Demucs, AudioSep, PyTorch, Torchaudio, Whisper                              |
| **GPU**      | CUDA                                                                                                  |

## Project Structure

```
soundFilter/
├── AudioAPI/               # FastAPI Backend
│   ├── data/
│   │   ├── uploads/        # Stores original user uploads
│   │   └── results/        # Stores AI-separated files
│   ├── modules/
│   │   ├── demucs_task.py  # Music separation logic
│   │   └── audiosep_task.py# Environmental sound separation logic
│   ├── main.py             # Main API file, routing and request handling
│   └── requirements.txt    # Required Python libraries
│
└── Frontend/               # React Frontend
    ├── src/
    │   ├── app/
    │   │   ├── components/ # Reusable components (e.g., TrackCard)
    │   │   └── screens/    # Main screens (MusicWorkspace, EnvironmentWorkspace)
    │   ├── main.tsx        # React application entry point
    └── package.json        # Required JavaScript libraries
```

## Workflow

1.  **Upload:** The user selects an audio file and a processing mode from the frontend interface.
2.  **Send request:** The frontend sends the file to the corresponding backend API (`/api/separate-music` or `/api/separate-env`).
3.  **Background Processing:** The Backend saves the file, generates a unique `task_id`, and launches a background task (Demucs or AudioSep). It immediately returns the `task_id` to the Frontend.
4.  **Monitoring Progress:** The Frontend redirects to the Workspace screen and begins periodically "checking in" with the endpoint `/api/status/{task_id}` to check the status.
5.  **Completion:** When the AI task finishes running, it saves the result files to the `data/results/{task_id}/` directory and creates a `status.json` file to signal completion.
6.  **Display results:** When the Frontend receives a "completed" response from the status endpoint, it loads the information from `status.json` and displays the extracted audio tracks on the interface.
7.  **Interaction:** Users can preview and download the result files. These files are served statically by the Backend.

## Setup and Run

### Prerequisites

-   Node.js (v18 or later) and npm/yarn
-   Python (v3.9 or later) and pip
-   **(Highly recommended)** An NVIDIA graphics card with CUDA support to accelerate AI processing.

### 1. Setup Backend (AudioAPI)

```bash
# Navigate to the backend directory
cd AudioAPI

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate

# Install the required libraries
pip install -r requirements.txt

# Run the backend server
# The server will run at http://127.0.0.1:8000
uvicorn main:app --reload
```

### 2. Setup Frontend

```bash
# Open a new terminal and navigate to the frontend directory
cd Frontend

# Install Node.js libraries
npm install

#  Run the development server 
# The server will run at http://localhost:5173
npm run dev
```

After completing the steps above, go to `http://localhost:5173` in your browser to start using the app.
