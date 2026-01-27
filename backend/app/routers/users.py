"""
Kullanıcı yönetimi API endpoint'leri
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.user_service import user_service

router = APIRouter(prefix="/users", tags=["users"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str


class AddUserRequest(BaseModel):
    admin_username: str
    new_username: str
    new_password: str
    is_admin: bool = False


class DeleteUserRequest(BaseModel):
    admin_username: str
    target_username: str


class ResetPasswordRequest(BaseModel):
    admin_username: str
    target_username: str
    new_password: str


class ListUsersRequest(BaseModel):
    admin_username: str


@router.post("/login")
async def login(request: LoginRequest):
    """Kullanıcı girişi"""
    result = user_service.authenticate(request.username, request.password)
    if result:
        return {
            "success": True,
            "user": result
        }
    return {
        "success": False,
        "message": "Kullanıcı adı veya şifre hatalı"
    }


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest):
    """Şifre değiştir"""
    success, message = user_service.change_password(
        request.username,
        request.old_password,
        request.new_password
    )
    return {
        "success": success,
        "message": message
    }


@router.post("/add")
async def add_user(request: AddUserRequest):
    """Yeni kullanıcı ekle"""
    success, message = user_service.add_user(
        request.admin_username,
        request.new_username,
        request.new_password,
        request.is_admin
    )
    return {
        "success": success,
        "message": message
    }


@router.post("/delete")
async def delete_user(request: DeleteUserRequest):
    """Kullanıcı sil"""
    success, message = user_service.delete_user(
        request.admin_username,
        request.target_username
    )
    return {
        "success": success,
        "message": message
    }


@router.post("/list")
async def list_users(request: ListUsersRequest):
    """Tüm kullanıcıları listele"""
    success, result = user_service.list_users(request.admin_username)
    if success:
        return {
            "success": True,
            "users": result
        }
    return {
        "success": False,
        "message": result
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Kullanıcı şifresini sıfırla (admin)"""
    success, message = user_service.reset_password(
        request.admin_username,
        request.target_username,
        request.new_password
    )
    return {
        "success": success,
        "message": message
    }
