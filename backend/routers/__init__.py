"""
Router modülleri için merkezi import noktası.
Bu sayede diğer modüller tek bir noktadan tüm router'lara erişebilir.
"""

from .auth import router as auth_router
from .events import router as events_router
from .users import router as users_router

# Dışa açılan router'lar
__all__ = ["auth_router", "events_router", "users_router"]
