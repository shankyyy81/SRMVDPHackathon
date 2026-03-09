from datetime import datetime
from typing import List

from beanie import Document
from pydantic import Field


class LiteratureDocument(Document):
    project_id: str
    filename: str
    content_type: str
    size_bytes: int
    uploaded_by: str
    storage_filename: str = ""
    paper_title: str = ""
    paper_author: str = ""
    paper_subject: str = ""
    paper_keywords: str = ""
    chunks: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "literature_documents"
