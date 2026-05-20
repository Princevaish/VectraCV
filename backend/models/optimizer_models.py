from pydantic import BaseModel
from typing import Optional

class OptimizeRequest(BaseModel):
    resume_text: str
    job_description: str
    target_role: Optional[str] = None
    tone: Optional[str] = "professional"
    focus_area: Optional[str] = "ATS optimization"

class OptimizeResponse(BaseModel):
    optimized_resume: str
