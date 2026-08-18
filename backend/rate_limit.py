# Tüm router'ların paylaştığı tek Limiter örneği.
# Her router kendi Limiter'ını oluşturursa sayaçlar ayrı tutulur ve
# limitler beklenenden kat kat gevşek davranır.

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
