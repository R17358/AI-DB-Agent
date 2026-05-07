from typing import Any, Dict, List, Optional, Tuple
from config import settings
import re

# ── SQL connector ────────────────────────────────────────────────────────────
class SQLConnector:
    def __init__(self):
        from sqlalchemy import create_engine, text, inspect
        self.engine = create_engine(settings.DB_URI)
        self.text = text
        self.inspect = inspect

    def get_schema(self) -> Dict[str, Any]:
        inspector = self.inspect(self.engine)
        schema = {}
        for table in inspector.get_table_names():
            cols = inspector.get_columns(table)
            schema[table] = [
                {"name": c["name"], "type": str(c["type"])} for c in cols
            ]
        return schema

    def is_read_only(self, query: str) -> bool:
        q = query.strip().upper()
        write_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE",
                          "ALTER", "TRUNCATE", "REPLACE", "MERGE", "EXEC"]
        return not any(q.startswith(kw) or f" {kw} " in q for kw in write_keywords)

    def execute(self, query: str) -> Tuple[List[Dict], List[str], str]:
        """Returns (rows, columns, query_used)"""
        with self.engine.connect() as conn:
            result = conn.execute(self.text(query))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchmany(settings.MAX_ROWS)]
        # Mask sensitive columns
        sensitive = settings.sensitive_columns_list
        masked_rows = []
        for row in rows:
            masked = {}
            for k, v in row.items():
                masked[k] = "***REDACTED***" if k.lower() in sensitive else v
            masked_rows.append(masked)
        return masked_rows, columns, query

    def get_sample_values(self, table: str, column: str, limit: int = 5) -> List[Any]:
        """For context — returns non-sensitive sample values"""
        if column.lower() in settings.sensitive_columns_list:
            return ["[REDACTED]"]
        with self.engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text(f"SELECT DISTINCT {column} FROM {table} LIMIT {limit}"))
            return [row[0] for row in result]


# ── MongoDB connector ────────────────────────────────────────────────────────
class MongoConnector:
    def __init__(self):
        from pymongo import MongoClient
        self.client = MongoClient(settings.MONGO_URI)
        self.db = self.client[settings.MONGO_DB_NAME]

    def get_schema(self) -> Dict[str, Any]:
        schema = {}
        for coll_name in self.db.list_collection_names():
            sample = self.db[coll_name].find_one()
            if sample:
                schema[coll_name] = list(sample.keys())
            else:
                schema[coll_name] = []
        return schema

    def is_read_only(self, query: Dict) -> bool:
        """Check if mongo operation is read-only"""
        write_ops = {"insert", "update", "delete", "drop", "createIndex",
                     "insertOne", "insertMany", "updateOne", "updateMany",
                     "deleteOne", "deleteMany", "replaceOne"}
        op = query.get("operation", "find").lower()
        return op not in write_ops

    def execute(self, query: Dict) -> Tuple[List[Dict], List[str], str]:
        """Execute a MongoDB operation dict: {collection, operation, filter, projection, limit, pipeline}"""
        import json
        coll_name = query.get("collection")
        operation = query.get("operation", "find")
        coll = self.db[coll_name]
        limit = min(query.get("limit", settings.MAX_ROWS), settings.MAX_ROWS)

        if operation == "find":
            cursor = coll.find(
                query.get("filter", {}),
                query.get("projection", None)
            ).limit(limit)
            rows = list(cursor)
        elif operation == "aggregate":
            rows = list(coll.aggregate(query.get("pipeline", [])))
        elif operation == "count":
            count = coll.count_documents(query.get("filter", {}))
            rows = [{"count": count}]
        else:
            rows = []

        # Stringify ObjectId & mask sensitive
        sensitive = settings.sensitive_columns_list
        cleaned = []
        for row in rows:
            row.pop("_id", None)
            masked = {}
            for k, v in row.items():
                masked[k] = "***REDACTED***" if k.lower() in sensitive else v
            cleaned.append(masked)

        columns = list(cleaned[0].keys()) if cleaned else []
        return cleaned, columns, json.dumps(query, indent=2)


# ── Factory ──────────────────────────────────────────────────────────────────
_connector = None

def get_connector():
    global _connector
    if _connector is None:
        if settings.is_mongo:
            _connector = MongoConnector()
        else:
            _connector = SQLConnector()
    return _connector
