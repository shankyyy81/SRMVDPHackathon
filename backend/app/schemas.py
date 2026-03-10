from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from beanie import PydanticObjectId
from app.models.user import UserRole, FacultyProfile, StudentProfile
from app.models.project import TaskStatus
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    # For simplicity, passing profile data as generic dict or specific structure
    faculty_profile: Optional[FacultyProfile] = None
    student_profile: Optional[StudentProfile] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str # PydanticObjectId
    email: EmailStr
    full_name: str
    role: UserRole
    faculty_profile: Optional[FacultyProfile] = None
    student_profile: Optional[StudentProfile] = None
    is_assigned: bool = False
    assigned_project_id: Optional[str] = None

class ProjectCreate(BaseModel):
    title: str
    problem_statement: str
    sdg_mapping: Dict[str, str] = {}
    ml_confidence_scores: Dict[str, float] = {}

class ProjectAssign(BaseModel):
    team_name: Optional[str] = None
    leader_id: Optional[PydanticObjectId] = None
    member_ids: Optional[List[PydanticObjectId]] = None

class ProjectView(BaseModel):
    id: str
    title: str
    problem_statement: str
    status: str
    sdg_mapping: Dict[str, str] = {}
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    team_name: Optional[str] = None
    leader_name: Optional[str] = None
    member_names: List[str] = []

class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: TaskStatus = TaskStatus.TODO

class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None

class TaskAttachmentView(BaseModel):
    id: str
    filename: str
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_by: Optional[str] = None
    uploaded_at: datetime

class ProjectTaskView(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    status: TaskStatus
    created_by: Optional[str] = None
    created_at: datetime
    attachments: List[TaskAttachmentView] = []

class ProjectWorkspaceView(BaseModel):
    id: str
    title: str
    problem_statement: str
    status: str
    sdg_mapping: Dict[str, str] = {}
    faculty_name: Optional[str] = None
    team_name: Optional[str] = None
    leader_name: Optional[str] = None
    member_names: List[str] = []
    tasks: List[ProjectTaskView] = []

class ProjectChatMessageCreate(BaseModel):
    message: str

class ProjectChatMessageView(BaseModel):
    id: str
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    message: str
    created_at: datetime

class RagQueryRequest(BaseModel):
    query: str
    top_k: int = 4
