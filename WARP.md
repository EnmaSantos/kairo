# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Kairo is a FastAPI-based prototype for AI-powered audio transcription using OpenAI's Whisper model. The application is optimized for Apple Silicon (M1/M2) GPUs using the Metal Performance Shaders (MPS) framework.

## Architecture

### Core Components

- **main.py**: FastAPI application with Whisper transcription endpoint
- **database.py**: SQLAlchemy database configuration (PostgreSQL via environment variables)
- **benchmark_audio.py**: Audio transcription performance testing script
- **benchmark_text.py**: Text model (BERT, DistilBERT) performance testing script

### Key Design Patterns

- **Model Loading**: AI models are loaded once at startup to minimize API response times
- **GPU Acceleration**: All AI models use `device='mps'` for Apple Silicon GPU acceleration
- **Environment Configuration**: Database credentials and sensitive data managed via `.env` files

## Development Commands

### Environment Setup
```bash
# Activate the Python virtual environment
source kairo-env/bin/activate

# Install dependencies (inferred from code analysis)
pip install fastapi uvicorn transformers librosa sqlalchemy python-dotenv torch
```

### Running the Application
```bash
# Start the FastAPI development server
uvicorn main:app --reload

# The API will be available at http://localhost:8000
# Main endpoint: GET /prototype/run_transcription_test
```

### Testing and Benchmarking
```bash
# Test audio transcription performance
python benchmark_audio.py

# Test text model performance
python benchmark_text.py
```

### Database Setup
Create a `.env` file with:
```
DATABASE_URL=postgresql://username:password@localhost/database_name
```

## AI Model Configuration

### Current Models
- **Whisper**: `openai/whisper-base` (~290MB) for audio transcription
- **Text Models**: DistilBERT, BERT-base, BERT-large for text processing

### GPU Requirements
- Requires Apple Silicon (M1/M2/M3) with MPS support
- Models automatically load onto GPU using `device='mps'`
- Fallback to CPU if MPS unavailable

## API Endpoints

- `GET /`: Welcome message
- `GET /prototype/run_transcription_test`: Main transcription endpoint using sample audio

## Development Notes

### Performance Considerations
- Model loading happens at startup, not per request
- Audio processing uses 16kHz sampling rate for Whisper compatibility
- Benchmark scripts measure both model loading time and inference time

### Dependencies
- FastAPI for web framework
- Transformers (Hugging Face) for AI models
- Librosa for audio processing
- SQLAlchemy for database ORM
- PyTorch with MPS support for GPU acceleration

### File Structure
```
kairo/
├── main.py              # FastAPI application
├── database.py          # Database configuration
├── benchmark_audio.py   # Audio model testing
├── benchmark_text.py    # Text model testing
├── kairo-env/          # Python virtual environment
└── .env                # Environment variables (not tracked)
```