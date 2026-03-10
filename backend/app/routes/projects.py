from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from typing import List, Annotated
from beanie import PydanticObjectId
import aiofiles
import os
import uuid
import mimetypes
from pathlib import Path

from app.routes.auth import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus, Team, ProjectTask, ProjectChatMessage, TaskAttachment
from app.schemas import (
    ProjectCreate,
    ProjectAssign,
    ProjectView,
    ProjectTaskCreate,
    ProjectTaskUpdate,
    ProjectTaskView,
    ProjectWorkspaceView,
    ProjectChatMessageCreate,
    ProjectChatMessageView,
    TaskAttachmentView,
)

# Directory where uploaded files are stored
UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_PREFIXES = {"image/", "application/pdf", "text/"}
ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".docx", ".xlsx", ".pptx", ".txt", ".csv", ".zip",
}

router = APIRouter()

def _get_link_id(link_obj):
    if link_obj is None:
        return None
    if hasattr(link_obj, "id"):
        return link_obj.id
    if hasattr(link_obj, "ref") and hasattr(link_obj.ref, "id"):
        return link_obj.ref.id
    if isinstance(link_obj, dict) and "$id" in link_obj:
        return link_obj["$id"]
    if isinstance(link_obj, dict) and "_id" in link_obj:
        return link_obj["_id"]
    if isinstance(link_obj, dict) and "id" in link_obj:
        return link_obj["id"]
    return None

def _is_project_participant(project: Project, current_user: User) -> bool:
    faculty_id = _get_link_id(project.faculty)
    if faculty_id == current_user.id:
        return True
    if not project.team:
        return False
    leader_id = _get_link_id(project.team.leader)
    if leader_id == current_user.id:
        return True
    if project.team.members:
        for member in project.team.members:
            if _get_link_id(member) == current_user.id:
                return True
    return False

@router.post("/", response_model=Project)
async def create_project(
    project_in: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    # 1. Check Role
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only Faculty can create projects")
    
    # 2. Check Constraint (Max 5 Active Projects)
    active_count = await Project.find(
        Project.faculty.id == current_user.id,
        Project.status != ProjectStatus.COMPLETED
    ).count()
    
    if active_count >= 5:
        raise HTTPException(
            status_code=403, 
            detail="Faculty cannot supervise more than 5 active projects."
        )
    
    # 3. Create Project
    project = Project(**project_in.dict(), faculty=current_user)
    await project.insert()
    return project

@router.get("/", response_model=List[Project])
async def list_projects(
    current_user: Annotated[User, Depends(get_current_user)]
):
    # For now, return all projects. Filter logic can be added later.
    projects = await Project.find_all().to_list()
    return projects

@router.get("/my-projects", response_model=List[Project])
async def list_my_projects(
    current_user: Annotated[User, Depends(get_current_user)]
):
    if current_user.role == UserRole.FACULTY:
        projects = await Project.find(Project.faculty.id == current_user.id).to_list()
    else:
        all_projects = await Project.find({"team": {"$ne": None}}).to_list()
        projects = []
        for p in all_projects:
            if not p.team:
                continue
            leader_id = _get_link_id(p.team.leader)
            if leader_id == current_user.id:
                projects.append(p)
                continue
            if p.team.members:
                for m in p.team.members:
                    if _get_link_id(m) == current_user.id:
                        projects.append(p)
                        break
        
    return projects

@router.get("/my-projects-view", response_model=List[ProjectView])
async def list_my_projects_view(
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Use the existing logic but avoid link fetching to prevent Motor cursor issues
    if current_user.role == UserRole.FACULTY:
        projects = await Project.find(Project.faculty.id == current_user.id).to_list()
    else:
        all_projects = await Project.find({"team": {"$ne": None}}).to_list()
        projects = []
        for p in all_projects:
            if not p.team:
                continue
            leader_id = _get_link_id(p.team.leader)
            if leader_id == current_user.id:
                projects.append(p)
                continue
            if p.team.members:
                for m in p.team.members:
                    if _get_link_id(m) == current_user.id:
                        projects.append(p)
                        break

    # Collect related user ids
    user_ids = set()
    for p in projects:
        faculty_id = _get_link_id(p.faculty)
        if faculty_id:
            user_ids.add(faculty_id)
        if p.team:
            leader_id = _get_link_id(p.team.leader)
            if leader_id:
                user_ids.add(leader_id)
            if p.team.members:
                for m in p.team.members:
                    member_id = _get_link_id(m)
                    if member_id:
                        user_ids.add(member_id)

    users_by_id = {}
    if user_ids:
        # Use Motor client directly to avoid Beanie fetch_links issues
        cursor = User.get_pymongo_collection().find({"_id": {"$in": list(user_ids)}})
        user_docs = await cursor.to_list(length=None)
        for doc in user_docs:
            users_by_id[str(doc["_id"])] = doc

    # Build view models
    result = []
    for p in projects:
        faculty_id = _get_link_id(p.faculty)
        faculty_doc = users_by_id.get(str(faculty_id)) if faculty_id else None
        faculty_name = faculty_doc.get("full_name") if faculty_doc else None

        leader_name = None
        member_names = []
        team_name = p.team.name if p.team else None
        if p.team:
            leader_id = _get_link_id(p.team.leader)
            leader_doc = users_by_id.get(str(leader_id)) if leader_id else None
            leader_name = leader_doc.get("full_name") if leader_doc else None
            if p.team.members:
                for m in p.team.members:
                    member_id = _get_link_id(m)
                    member_doc = users_by_id.get(str(member_id)) if member_id else None
                    if member_doc and member_doc.get("full_name"):
                        member_names.append(member_doc["full_name"])

        result.append(ProjectView(
            id=str(p.id),
            title=p.title,
            problem_statement=p.problem_statement,
            status=p.status.value if hasattr(p.status, "value") else str(p.status),
            sdg_mapping=p.sdg_mapping or {},
            faculty_id=str(faculty_id) if faculty_id else None,
            faculty_name=faculty_name,
            team_name=team_name,
            leader_name=leader_name,
            member_names=member_names
        ))

    return result

@router.get("/{project_id}/workspace", response_model=ProjectWorkspaceView)
async def get_project_workspace(
    project_id: PydanticObjectId,
    current_user: Annotated[User, Depends(get_current_user)]
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to access this project workspace")

    user_ids = set()
    faculty_id = _get_link_id(project.faculty)
    if faculty_id:
        user_ids.add(faculty_id)
    if project.team:
        leader_id = _get_link_id(project.team.leader)
        if leader_id:
            user_ids.add(leader_id)
        if project.team.members:
            for m in project.team.members:
                member_id = _get_link_id(m)
                if member_id:
                    user_ids.add(member_id)

    users_by_id = {}
    if user_ids:
        cursor = User.get_pymongo_collection().find({"_id": {"$in": list(user_ids)}})
        user_docs = await cursor.to_list(length=None)
        for doc in user_docs:
            users_by_id[str(doc["_id"])] = doc

    faculty_name = None
    leader_name = None
    member_names = []
    if faculty_id:
        faculty_doc = users_by_id.get(str(faculty_id))
        faculty_name = faculty_doc.get("full_name") if faculty_doc else None
    if project.team:
        leader_id = _get_link_id(project.team.leader)
        if leader_id:
            leader_doc = users_by_id.get(str(leader_id))
            leader_name = leader_doc.get("full_name") if leader_doc else None
        if project.team.members:
            for m in project.team.members:
                member_id = _get_link_id(m)
                if not member_id:
                    continue
                member_doc = users_by_id.get(str(member_id))
                if member_doc and member_doc.get("full_name"):
                    member_names.append(member_doc["full_name"])

    def _attachment_view(a):
        return TaskAttachmentView(
            id=a.id,
            filename=a.filename,
            original_name=a.original_name,
            content_type=a.content_type,
            size_bytes=a.size_bytes,
            uploaded_by=a.uploaded_by,
            uploaded_at=a.uploaded_at,
        )

    task_views = [
        ProjectTaskView(
            id=t.id,
            title=t.title,
            description=t.description,
            status=t.status,
            created_by=t.created_by,
            created_at=t.created_at,
            attachments=[_attachment_view(a) for a in (t.attachments or [])],
        )
        for t in (project.tasks or [])
    ]

    return ProjectWorkspaceView(
        id=str(project.id),
        title=project.title,
        problem_statement=project.problem_statement,
        status=project.status.value if hasattr(project.status, "value") else str(project.status),
        sdg_mapping=project.sdg_mapping or {},
        faculty_name=faculty_name,
        team_name=project.team.name if project.team else None,
        leader_name=leader_name,
        member_names=member_names,
        tasks=task_views
    )

@router.post("/{project_id}/tasks", response_model=ProjectTaskView)
async def add_project_task(
    project_id: PydanticObjectId,
    payload: ProjectTaskCreate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to modify this project workspace")

    task = ProjectTask(
        title=payload.title,
        description=payload.description,
        status=payload.status,
        created_by=current_user.full_name
    )
    if project.tasks is None:
        project.tasks = []
    project.tasks.append(task)
    await project.save()

    return ProjectTaskView(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        created_by=task.created_by,
        created_at=task.created_at,
        attachments=[],
    )
@router.get("/{project_id}/chat", response_model=List[ProjectChatMessageView])
async def list_project_chat(
    project_id: PydanticObjectId,
    current_user: Annotated[User, Depends(get_current_user)]
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to access this project workspace")

    messages = project.chat_messages or []
    messages = sorted(messages, key=lambda m: m.created_at)
    return [
        ProjectChatMessageView(
            id=m.id,
            sender_id=m.sender_id,
            sender_name=m.sender_name,
            sender_role=m.sender_role,
            message=m.message,
            created_at=m.created_at
        )
        for m in messages
    ]

@router.post("/{project_id}/chat", response_model=ProjectChatMessageView)
async def post_project_chat(
    project_id: PydanticObjectId,
    payload: ProjectChatMessageCreate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to modify this project workspace")

    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    chat = ProjectChatMessage(
        sender_id=str(current_user.id),
        sender_name=current_user.full_name,
        sender_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        message=message
    )
    if project.chat_messages is None:
        project.chat_messages = []
    project.chat_messages.append(chat)
    await project.save()

    return ProjectChatMessageView(
        id=chat.id,
        sender_id=chat.sender_id,
        sender_name=chat.sender_name,
        sender_role=chat.sender_role,
        message=chat.message,
        created_at=chat.created_at
    )

@router.patch("/{project_id}/tasks/{task_id}", response_model=ProjectTaskView)
async def update_project_task(
    project_id: PydanticObjectId,
    task_id: str,
    payload: ProjectTaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to modify this project workspace")

    tasks = project.tasks or []
    task_idx = next((idx for idx, t in enumerate(tasks) if t.id == task_id), -1)
    if task_idx == -1:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_idx]
    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.status is not None:
        task.status = payload.status

    project.tasks[task_idx] = task
    await project.save()

    return ProjectTaskView(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        created_by=task.created_by,
        created_at=task.created_at,
        attachments=[TaskAttachmentView(
            id=a.id, filename=a.filename, original_name=a.original_name,
            content_type=a.content_type, size_bytes=a.size_bytes,
            uploaded_by=a.uploaded_by, uploaded_at=a.uploaded_at,
        ) for a in (task.attachments or [])],
    )

@router.delete("/{project_id}")
async def delete_project(
    project_id: PydanticObjectId,
    current_user: Annotated[User, Depends(get_current_user)]
):
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only Faculty can delete projects")

    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    faculty_id = project.faculty.id if hasattr(project.faculty, "id") else project.faculty.ref.id
    if faculty_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this project")

    await project.delete()
    return {"status": "deleted", "id": str(project_id)}

@router.patch("/{project_id}/assign", response_model=Project)
async def assign_students(
    project_id: PydanticObjectId,
    payload: ProjectAssign,
    current_user: Annotated[User, Depends(get_current_user)]
):
    # 1. Only faculty can assign
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only Faculty can assign students")

    # 2. Project must exist and belong to faculty
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    faculty_id = project.faculty.id if hasattr(project.faculty, "id") else project.faculty.ref.id
    if faculty_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to modify this project")

    # Check for existing assignments in other projects
    target_user_ids = set()
    if payload.leader_id:
        target_user_ids.add(str(payload.leader_id))
    if payload.member_ids:
        for mid in payload.member_ids:
            target_user_ids.add(str(mid))
            
    if target_user_ids:
        other_projects = await Project.find({"team": {"$ne": None}, "_id": {"$ne": project.id}}).to_list()
        for p in other_projects:
            if not p.team: continue
            
            check_ids = set()
            l_id = _get_link_id(p.team.leader)
            if l_id: check_ids.add(str(l_id))
            if p.team.members:
                for m in p.team.members:
                    m_id = _get_link_id(m)
                    if m_id: check_ids.add(str(m_id))
                    
            overlap = target_user_ids.intersection(check_ids)
            if overlap:
                overlap_users = []
                for uid in overlap:
                    u = await User.get(PydanticObjectId(uid))
                    overlap_users.append(u.full_name if u else uid)
                raise HTTPException(status_code=400, detail=f"Cannot assign students already in another project: {', '.join(overlap_users)}")

    # 3. Resolve leader
    leader_user = None
    if payload.leader_id:
        leader_user = await User.get(payload.leader_id)
        if not leader_user or leader_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=400, detail="Leader must be a valid student")
    elif project.team:
        leader_user = project.team.leader
    else:
        raise HTTPException(status_code=400, detail="leader_id is required to create a new team")

    # 4. Resolve members
    members = None
    if payload.member_ids is not None:
        members = []
        for member_id in payload.member_ids:
            member_user = await User.get(member_id)
            if not member_user or member_user.role != UserRole.STUDENT:
                raise HTTPException(status_code=400, detail="All members must be valid students")
            members.append(member_user)
    elif project.team:
        members = project.team.members
    else:
        members = []

    # 5. Build team and save
    team_name = payload.team_name or (project.team.name if project.team else "Team A")
    project.team = Team(name=team_name, leader=leader_user, members=members)
    await project.save()
    return project


# =========================================================
# ATTACHMENT ENDPOINTS
# =========================================================

@router.post("/{project_id}/tasks/{task_id}/attachments", response_model=TaskAttachmentView)
async def upload_attachment(
    project_id: PydanticObjectId,
    task_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read & validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 10 MB")

    # Find the task
    tasks = project.tasks or []
    task_idx = next((i for i, t in enumerate(tasks) if t.id == task_id), -1)
    if task_idx == -1:
        raise HTTPException(status_code=404, detail="Task not found")

    # Build a safe on-disk filename
    safe_id = str(uuid.uuid4())
    disk_filename = f"{safe_id}{ext}"
    content_type = file.content_type or (mimetypes.guess_type(file.filename)[0] or "application/octet-stream")

    # Write to disk
    dest_dir = UPLOAD_ROOT / str(project_id) / task_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / disk_filename
    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(contents)

    # Persist metadata
    attachment = TaskAttachment(
        id=safe_id,
        filename=disk_filename,
        original_name=file.filename or disk_filename,
        content_type=content_type,
        size_bytes=len(contents),
        uploaded_by=current_user.full_name,
    )
    project.tasks[task_idx].attachments.append(attachment)
    await project.save()

    return TaskAttachmentView(
        id=attachment.id,
        filename=attachment.filename,
        original_name=attachment.original_name,
        content_type=attachment.content_type,
        size_bytes=attachment.size_bytes,
        uploaded_by=attachment.uploaded_by,
        uploaded_at=attachment.uploaded_at,
    )


@router.get("/{project_id}/tasks/{task_id}/attachments/{attachment_id}")
async def download_attachment(
    project_id: PydanticObjectId,
    task_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    task = next((t for t in (project.tasks or []) if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    attachment = next((a for a in (task.attachments or []) if a.id == attachment_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = UPLOAD_ROOT / str(project_id) / task_id / attachment.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=str(file_path),
        media_type=attachment.content_type,
        filename=attachment.original_name,
    )


@router.delete("/{project_id}/tasks/{task_id}/attachments/{attachment_id}")
async def delete_attachment(
    project_id: PydanticObjectId,
    task_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_project_participant(project, current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    tasks = project.tasks or []
    task_idx = next((i for i, t in enumerate(tasks) if t.id == task_id), -1)
    if task_idx == -1:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_idx]
    att_idx = next((i for i, a in enumerate(task.attachments or []) if a.id == attachment_id), -1)
    if att_idx == -1:
        raise HTTPException(status_code=404, detail="Attachment not found")

    attachment = task.attachments[att_idx]

    # Only uploader or faculty can delete
    is_faculty = current_user.role == UserRole.FACULTY
    is_uploader = attachment.uploaded_by == current_user.full_name
    if not is_faculty and not is_uploader:
        raise HTTPException(status_code=403, detail="Only the uploader or faculty can delete this attachment")

    # Remove file from disk
    file_path = UPLOAD_ROOT / str(project_id) / task_id / attachment.filename
    if file_path.exists():
        file_path.unlink()

    # Remove metadata record
    project.tasks[task_idx].attachments.pop(att_idx)
    await project.save()

    return {"status": "deleted", "attachment_id": attachment_id}
