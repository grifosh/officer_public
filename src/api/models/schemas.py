"""
Pydantic модели для API
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class EventCreate(BaseModel):
    subject: str
    start_time: str
    end_time: str
    notes: Optional[str] = None
    attendees: Optional[List[str]] = None
    streams: Optional[List[str]] = None
    
    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Subject cannot be empty')
        return v.strip()

class EventUpdate(BaseModel):
    subject: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None
    attendees: Optional[List[str]] = None
    streams: Optional[List[str]] = None
    
    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError('Subject cannot be empty')
        return v.strip() if v else None

class QuestionCreateRequest(BaseModel):
    question_text: str
    person: Optional[str] = None
    stream: Optional[str] = None
    event_id: Optional[int] = None
    event_subject: Optional[str] = None
    time: Optional[str] = None
    asap: bool = False
    important: bool = False

class QuestionResolveRequest(BaseModel):
    resolved: bool = True
    resolution_notes: Optional[str] = None

class CommentCreateRequest(BaseModel):
    content: str
    author: Optional[str] = None

class CommentResponse(BaseModel):
    id: int
    question_id: int
    content: str
    author: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AttendeeResponse(BaseModel):
    id: int
    email: Optional[str]
    name: Optional[str]
    surname: Optional[str]
    use_count: int
    last_used: Optional[str]
    last_searched_at: Optional[str]

class StreamResponse(BaseModel):
    id: int
    name: str
    use_count: int
    last_used: Optional[str]
