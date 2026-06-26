import os
from enum import Enum
from typing import Optional
from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from supabase import create_client, Client

app = FastAPI(title="AASIOM Contact API Engine", version="1.0.0")

# SECURITY: Restrict incoming requests strictly to trusted live website environments
ALLOWED_ORIGINS = [
    "https://aasiom-website.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize secure connection pool parameters
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Environment Config Matrix: Add SUPABASE credentials.")

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Exact text configuration constraints mapped directly from your dropdown UI
class ContactReason(str, Enum):
    EMERGENCY = "Emergency Response Partnership"
    SAFETY = "Highway & Road Safety Partnership"
    FLEET = "Fleet & Enterprise Solutions"
    INSURANCE = "Insurance & Risk Management"
    TECH = "Technology & Integration"
    RESEARCH = "Research & Academic Collaboration"
    STRATEGIC = "Strategic Partnership"
    CAREERS = "Careers & Internships"
    MEDIA = "Media & Press"
    GENERAL = "General Inquiry"

class ContactSubmissionSchema(BaseModel):
    # Mandatory attributes matching input field selectors
    full_name: str = Field(..., max_length=100, min_length=2)
    work_email: EmailStr
    company_name: str = Field(..., max_length=150, min_length=2)
    job_title: str = Field(..., max_length=100, min_length=2)
    reason: ContactReason
    message: str = Field(..., max_length=3000, min_length=10)
    
    # Optional Attributes mapped as explicitly nullable values
    phone_number: Optional[str] = Field(default=None, max_length=30)
    linkedin_profile: Optional[str] = Field(default=None, max_length=200)
    company_website: Optional[str] = Field(default=None, max_length=200)

    class Config:
        use_enum_values = True

router = APIRouter()

@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def accept_website_contact_form(payload: ContactSubmissionSchema):
    try:
        # Construct sanitized payload block, trimming whitespace blocks away
        sanitized_payload = {
            "full_name": payload.full_name.strip(),
            "work_email": payload.work_email.lower().strip(),
            "company_name": payload.company_name.strip(),
            "job_title": payload.job_title.strip(),
            "contact_reason": payload.reason,
            "message_content": payload.message.strip(),
            
            # Sanitize optional parameters gracefully only if they exist
            "phone_number": payload.phone_number.strip() if payload.phone_number else None,
            "linkedin_profile": payload.linkedin_profile.strip() if payload.linkedin_profile else None,
            "company_website": payload.company_website.strip() if payload.company_website else None
        }
        
        # Dispatch insert call query directly up to our database ledger
        db_trace = supabase_client.table("contact_submissions").insert(sanitized_payload).execute()
        
        if not db_trace.data:
            raise HTTPException(status_code=500, detail="Database rejected entry trace.")
            
        return {"status": "success", "message": "Form verification cleared and data logged."}
        
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Data bridge transaction error: {str(error)}")

app.include_router(router, prefix="/api/v1/contact", tags=["Contact"])

@app.get("/health")
async def validation_health_check():
    return {"status": "operational"}