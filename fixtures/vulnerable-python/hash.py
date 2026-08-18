import hashlib


def digest(data: bytes) -> bytes:
    return hashlib.md5(data).digest()
