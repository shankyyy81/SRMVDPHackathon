from beanie import Document, Link
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
from uuid import uuid4
from .user import User

class ProjectStatus(str, Enum):
    ON_TRACK = "On Track"
    DELAYED = "Delayed"
    COMPLETED = "Completed"

class Team(BaseModel):
    name: str = "Team A"
    leader: Link[User]  # Reference to Student
    members: List[Link[User]] = [] # References to Students

class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

class ProjectTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    description: Optional[str] = ""
    status: TaskStatus = TaskStatus.TODO
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Project(Document):
    title: str
    problem_statement: str
    status: ProjectStatus = ProjectStatus.ON_TRACK
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Owner
    faculty: Link[User] 
    
    # Assignment
    team: Optional[Team] = None
    
    # Analysis
    sdg_mapping: Dict[str, str] = {} # e.g. {"SDG 4": "Quality Education"}
    ml_confidence_scores: Dict[str, float] = {}
    tasks: List[ProjectTask] = []
    chat_messages: List[ProjectChatMessage] = []

    class Settings:
        name = "projects"
