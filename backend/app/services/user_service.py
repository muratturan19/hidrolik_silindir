"""
Kullanıcı yönetim servisi
Kullanıcı bilgilerini JSON dosyasında saklar
"""
import json
import hashlib
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

# Data dizini
DATA_DIR = Path(__file__).parent.parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"


class User(BaseModel):
    username: str
    password_hash: str
    is_admin: bool = False


class UserService:
    def __init__(self):
        self._ensure_data_dir()
        self._ensure_default_user()

    def _ensure_data_dir(self):
        """Data dizininin var olduğundan emin ol"""
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    def _hash_password(self, password: str) -> str:
        """Şifreyi hashle"""
        return hashlib.sha256(password.encode()).hexdigest()

    def _load_users(self) -> dict:
        """Kullanıcıları dosyadan yükle"""
        if not USERS_FILE.exists():
            return {}
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}

    def _save_users(self, users: dict):
        """Kullanıcıları dosyaya kaydet"""
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2, ensure_ascii=False)

    def _ensure_default_user(self):
        """Varsayılan admin kullanıcısını oluştur (yoksa)"""
        users = self._load_users()
        if not users:
            users['admin'] = {
                'username': 'admin',
                'password_hash': self._hash_password('Admin123!'),
                'is_admin': True
            }
            self._save_users(users)

    def authenticate(self, username: str, password: str) -> Optional[dict]:
        """Kullanıcı girişini doğrula"""
        users = self._load_users()
        user = users.get(username)

        if not user:
            return None

        if user['password_hash'] == self._hash_password(password):
            return {
                'username': user['username'],
                'is_admin': user.get('is_admin', False)
            }
        return None

    def change_password(self, username: str, old_password: str, new_password: str) -> tuple[bool, str]:
        """Kullanıcı şifresini değiştir"""
        users = self._load_users()
        user = users.get(username)

        if not user:
            return False, "Kullanıcı bulunamadı"

        if user['password_hash'] != self._hash_password(old_password):
            return False, "Mevcut şifre yanlış"

        if len(new_password) < 6:
            return False, "Yeni şifre en az 6 karakter olmalı"

        users[username]['password_hash'] = self._hash_password(new_password)
        self._save_users(users)
        return True, "Şifre başarıyla değiştirildi"

    def add_user(self, admin_username: str, new_username: str, new_password: str, is_admin: bool = False) -> tuple[bool, str]:
        """Yeni kullanıcı ekle (sadece adminler yapabilir)"""
        users = self._load_users()

        # Admin kontrolü
        admin = users.get(admin_username)
        if not admin or not admin.get('is_admin', False):
            return False, "Bu işlem için admin yetkisi gerekli"

        # Kullanıcı adı kontrolü
        if new_username in users:
            return False, "Bu kullanıcı adı zaten mevcut"

        if len(new_username) < 3:
            return False, "Kullanıcı adı en az 3 karakter olmalı"

        if len(new_password) < 6:
            return False, "Şifre en az 6 karakter olmalı"

        users[new_username] = {
            'username': new_username,
            'password_hash': self._hash_password(new_password),
            'is_admin': is_admin
        }
        self._save_users(users)
        return True, f"Kullanıcı '{new_username}' başarıyla eklendi"

    def delete_user(self, admin_username: str, target_username: str) -> tuple[bool, str]:
        """Kullanıcı sil (sadece adminler yapabilir, kendini silemez)"""
        users = self._load_users()

        # Admin kontrolü
        admin = users.get(admin_username)
        if not admin or not admin.get('is_admin', False):
            return False, "Bu işlem için admin yetkisi gerekli"

        if admin_username == target_username:
            return False, "Kendinizi silemezsiniz"

        if target_username not in users:
            return False, "Kullanıcı bulunamadı"

        del users[target_username]
        self._save_users(users)
        return True, f"Kullanıcı '{target_username}' silindi"

    def list_users(self, admin_username: str) -> tuple[bool, list | str]:
        """Tüm kullanıcıları listele (sadece adminler)"""
        users = self._load_users()

        # Admin kontrolü
        admin = users.get(admin_username)
        if not admin or not admin.get('is_admin', False):
            return False, "Bu işlem için admin yetkisi gerekli"

        user_list = [
            {
                'username': u['username'],
                'is_admin': u.get('is_admin', False)
            }
            for u in users.values()
        ]
        return True, user_list

    def reset_password(self, admin_username: str, target_username: str, new_password: str) -> tuple[bool, str]:
        """Kullanıcı şifresini sıfırla (admin yetkisi gerekir)"""
        users = self._load_users()

        # Admin kontrolü
        admin = users.get(admin_username)
        if not admin or not admin.get('is_admin', False):
            return False, "Bu işlem için admin yetkisi gerekli"

        if target_username not in users:
            return False, "Kullanıcı bulunamadı"

        if len(new_password) < 6:
            return False, "Yeni şifre en az 6 karakter olmalı"

        users[target_username]['password_hash'] = self._hash_password(new_password)
        self._save_users(users)
        return True, f"'{target_username}' kullanıcısının şifresi sıfırlandı"


# Singleton instance
user_service = UserService()
