from beanie import Document
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"

class FacultyProfile(BaseModel):
    department: str
    interests: List[str] = []
    # active_projects_count is calculated, not stored strictly, 
    # but we can cache it here if needed.

class StudentProfile(BaseModel):
    department: str
    year: str
    skills: List[str] = []
    # active_project_id: Optional[PydanticObjectId] = None

class User(Document):
    email: EmailStr
    hashed_password: str
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Embedded Profile Data
    faculty_profile: Optional[FacultyProfile] = None
    student_profile: Optional[StudentProfile] = None

    class Settings:
        name = "users"
