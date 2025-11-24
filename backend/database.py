import sqlite3
import json
import os
from typing import Any

DB_PATH = os.path.join(os.path.dirname(__file__), '../database/ontology.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')
MIGRATION_M2_PATH = os.path.join(os.path.dirname(__file__), 'migration_m2.sql')
MIGRATION_M3_PATH = os.path.join(os.path.dirname(__file__), 'migration_m3.sql')
MIGRATION_M4_PATH = os.path.join(os.path.dirname(__file__), 'migration_m4.sql')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    
    # Apply Base Schema
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()
    conn.executescript(schema)
    
    # Apply M2 Migration (Reconciliation)
    try:
        with open(MIGRATION_M2_PATH, 'r') as f:
            migration = f.read()
        conn.executescript(migration)
    except Exception as e:
        print(f"M2 Migration warning: {e}")

    # Apply M3 Migration (Central Company + Views)
    try:
        with open(MIGRATION_M3_PATH, 'r') as f:
            migration = f.read()
        conn.executescript(migration)
    except Exception as e:
        print(f"M3 Migration warning: {e}")

    # Apply M4 Migration (Attachments, Invoices, Proposals, Layouts)
    try:
        with open(MIGRATION_M4_PATH, 'r') as f:
            migration = f.read()
        conn.executescript(migration)
    except Exception as e:
        print(f"M4 Migration warning: {e}")

    conn.commit()
    conn.close()

def query_db(query: str, args: tuple = (), one: bool = False):
    conn = get_db_connection()
    cur = conn.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

def execute_db(query: str, args: tuple = ()):
    conn = get_db_connection()
    cur = conn.execute(query, args)
    conn.commit()
    last_row_id = cur.lastrowid
    conn.close()
    return last_row_id
