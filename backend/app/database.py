from sqlalchemy import create_engine,Column,Integer
from sqlalchemy.orm import declarative_base,sessionmaker
from .config import DB_URL
E=create_engine(DB_URL,connect_args={"check_same_thread":False} if DB_URL.startswith("sqlite") else {})
S=sessionmaker(E);B=declarative_base()
def T(n,**c):
    """Table factory: class n -> table n.lower()+'s' with integer primary key id."""
    return type(n,(B,),{"__tablename__":n.lower()+"s","id":Column(Integer,primary_key=True),**c})
