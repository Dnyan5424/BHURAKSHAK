import hashlib,hmac,base64,json,time
from fastapi import Header,HTTPException,Depends
from .config import SECRET
from .database import S
from .models import User
def hp(p):return hashlib.pbkdf2_hmac("sha256",p.encode(),SECRET.encode(),100000).hex()
def _b(x):return base64.urlsafe_b64encode(x).rstrip(b"=").decode()
def _sig(p):return _b(hmac.new(SECRET.encode(),p.encode(),"sha256").digest())
def make_token(uid,role):
    p=_b(json.dumps({"sub":uid,"role":role,"exp":time.time()+86400}).encode());return p+"."+_sig(p)
def db():
    s=S()
    try:yield s
    finally:s.close()
def user(authorization:str=Header(None),s=Depends(db)):
    try:
        p,g=authorization.split(" ")[1].split(".");assert hmac.compare_digest(g,_sig(p))
        d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4)));assert d["exp"]>time.time()
        return s.get(User,d["sub"])
    except Exception:raise HTTPException(401,"Invalid or missing token")
def need(*roles):
    def f(u=Depends(user)):
        if not u or u.role not in roles:raise HTTPException(403,"Forbidden")
        return u
    return f
