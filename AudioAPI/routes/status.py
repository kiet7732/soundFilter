"""
Status Routes
API endpoints cho task status checking và health check
"""
from fastapi import APIRouter
from services.task_service import get_task_status

router = APIRouter()


@router.get("/api/status/{task_id}")
async def check_status(task_id: str):
    """
    API kiểm tra trạng thái (Để React hỏi thăm liên tục)
    
    Args:
        task_id: ID của task cần kiểm tra
        
    Returns:
        Dict chứa status information
    """
    return get_task_status(task_id)


@router.get("/api/health")
async def health_check():
    """
    Health check endpoint
    
    Returns:
        Dict với status "ok"
    """
    return {"status": "ok"}
