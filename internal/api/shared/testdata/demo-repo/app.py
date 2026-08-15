# SYNTHETIC DEMO — weak cryptography for scanner acceptance tests. Not production code.
import hashlib
from Crypto.PublicKey import RSA

def fingerprint(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()

def generate_key():
    return RSA.generate(1024)
