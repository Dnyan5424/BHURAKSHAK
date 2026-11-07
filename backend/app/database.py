from sqlalchemy import create_engine,Column,Integer,inspect,text
from sqlalchemy.orm import declarative_base,sessionmaker
from .config import DB_URL
E=create_engine(DB_URL,connect_args={"check_same_thread":False} if DB_URL.startswith("sqlite") else {})
S=sessionmaker(E);B=declarative_base()
def T(n,**c):
    """Table factory: class n -> table n.lower()+'s' with integer primary key id."""
    return type(n,(B,),{"__tablename__":n.lower()+"s","id":Column(Integer,primary_key=True),**c})

def migrate_schema():
    """Add fields introduced after the original SQLite demo schema."""
    inspector=inspect(E)
    if "scenes" in inspector.get_table_names():
        existing={column["name"] for column in inspector.get_columns("scenes")}
        fields={
            "provider":"VARCHAR","external_scene_id":"VARCHAR","acquisition_date":"VARCHAR",
            "tile_id":"VARCHAR","source_type":"VARCHAR DEFAULT 'demo'","download_status":"VARCHAR DEFAULT 'local'",
            "processing_status":"VARCHAR DEFAULT 'not_started'","raster_paths":"TEXT","provider_metadata":"TEXT",
        }
        with E.begin() as connection:
            for name,definition in fields.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE scenes ADD COLUMN {name} {definition}"))
    if "automaticfetchconfigs" in inspector.get_table_names():
        existing={column["name"] for column in inspector.get_columns("automaticfetchconfigs")}
        fields={"last_discovery_date":"VARCHAR","automatic_jobs_date":"VARCHAR","automatic_jobs_count":"INTEGER DEFAULT 0","manual_jobs_limit":"INTEGER DEFAULT 5"}
        with E.begin() as connection:
            for name,definition in fields.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE automaticfetchconfigs ADD COLUMN {name} {definition}"))
    B.metadata.create_all(E)
