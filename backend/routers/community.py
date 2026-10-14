from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from backend.auth.deps import require_user, get_optional_user
from backend.data.store import store
from backend.db.models import User
from backend.models.schemas import PostCreateInput, CommentCreateInput
from backend.services.community_service import community_service

router = APIRouter(prefix="/api/community", tags=["Community"])

@router.get("/posts")
def get_posts(tag: Optional[str] = None, mentorId: Optional[str] = None):
    try:
        posts = community_service.get_posts(tag=tag, mentor_id=mentorId, user_id=None)
        return {"success": True, "count": len(posts), "data": posts}
    except Exception as e:
        print(f"[Community] {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/posts")
def create_post(payload: PostCreateInput, user: User = Depends(require_user)):
    # Only mentors post, always as their own mentor profile
    creator = store.get_creator_by_owner(user.id)
    if not creator:
        raise HTTPException(status_code=403, detail="Only mentors can publish posts")
    payload = payload.model_copy(update={
        'mentorId': creator.id,
        'mentorName': creator.name,
        'mentorRole': creator.role,
        'mentorCompany': creator.company,
        'mentorAvatar': creator.avatar,
    })
    post = community_service.create_post(payload)
    return {"success": True, "message": "Mentor discussion post published!", "data": post}

@router.post("/posts/{post_id}/comments")
def add_comment(post_id: str, payload: CommentCreateInput, user: User = Depends(require_user)):
    creator = store.get_creator_by_owner(user.id)
    profile = store.get_candidate(user.id)
    payload = payload.model_copy(update={
        'authorId': user.id,
        'authorName': (creator.name if creator else None) or (profile.name if profile else None) or user.name,
        'authorIsMentor': creator is not None,
    })
    comment = community_service.add_comment(post_id, payload)
    if not comment:
        raise HTTPException(status_code=404, detail=f"Post with ID {post_id} not found")
    return {"success": True, "message": "Comment posted successfully", "data": comment}

@router.post("/posts/{post_id}/like")
def toggle_post_like(post_id: str, payload: Optional[Dict[str, Any]] = None, user: Optional[User] = Depends(get_optional_user)):
    user_id = user.id if user else (payload.get("userId") if payload else None) or "prakash"
    return {"success": True, **community_service.toggle_post_like(post_id, user_id)}

@router.post("/posts/{post_id}/comments/{comment_id}/like")
def toggle_comment_like(post_id: str, comment_id: str, payload: Optional[Dict[str, Any]] = None, user: Optional[User] = Depends(get_optional_user)):
    user_id = user.id if user else (payload.get("userId") if payload else None) or "prakash"
    return {"success": True, **community_service.toggle_comment_like(post_id, comment_id, user_id)}
