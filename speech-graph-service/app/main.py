"""
FastAPI server for Speech Graph Analysis
Provides REST API for graph computation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from app.graph_analyzer import SpeechGraphAnalyzer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Speech Graph Analysis Service",
    description="Analyzes speech patterns for dementia detection using graph theory",
    version="1.0.0"
)

# CORS middleware for Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzer
analyzer = SpeechGraphAnalyzer(window_size=30, step_size=3)


class AnalysisRequest(BaseModel):
    text: str
    participant_id: Optional[str] = None
    session_id: Optional[str] = None


class AnalysisResponse(BaseModel):
    success: bool
    data: dict
    message: Optional[str] = None


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "service": "Speech Graph Analysis",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    """Health check for monitoring"""
    return {"status": "healthy"}


@app.post("/analyze", response_model=AnalysisResponse)
def analyze_speech(request: AnalysisRequest):
    """
    Analyze complete speech transcript and return graph metrics.

    Returns:
    - full_metrics: Overall graph statistics
    - window_metrics: Sliding window analysis results
    - aggregated_metrics: Average metrics across windows
    - visualization: Graph structure for D3.js
    """
    try:
        if not request.text or len(request.text.strip()) < 5:
            raise HTTPException(
                status_code=400,
                detail="Text too short for analysis (minimum 5 characters required)"
            )

        logger.info(f"Analyzing speech: {len(request.text)} characters")

        result = analyzer.analyze_full_transcript(request.text)

        logger.info(
            f"Analysis complete - Words: {result['word_count']}, "
            f"Unique: {result['unique_words']}, "
            f"LSC: {result['full_metrics']['lsc']}"
        )

        return AnalysisResponse(
            success=True,
            data=result,
            message="Analysis completed successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/analyze/realtime", response_model=AnalysisResponse)
def analyze_realtime(request: AnalysisRequest):
    """
    Analyze partial transcript for real-time visualization.
    Optimized for low-latency updates during live sessions.

    Returns:
    - visualization: Current graph structure
    - metrics: Quick metrics without sliding window
    """
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text is required")

        logger.info(f"Real-time analysis: {len(request.text)} characters")

        words = analyzer.preprocess_text(request.text)

        # For real-time, just analyze current state without sliding windows
        viz_data = analyzer.generate_visualization_data(words)
        quick_metrics = analyzer.analyze_window(words)

        return AnalysisResponse(
            success=True,
            data={
                'visualization': viz_data,
                'metrics': quick_metrics,
                'word_count': len(words),
            },
            message="Real-time analysis completed"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Real-time analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Real-time analysis failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
