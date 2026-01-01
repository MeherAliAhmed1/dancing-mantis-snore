import asyncio
from typing import List, Optional, Any, Dict
from bson import ObjectId
from datetime import datetime
import copy
import logging

logger = logging.getLogger("uvicorn")

class MockAsyncCursor:
    def __init__(self, data):
        self.data = data
        self._sort = None

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, str):
            self._sort = (key_or_list, direction or 1)
        elif isinstance(key_or_list, list) and len(key_or_list) > 0:
            self._sort = key_or_list[0]
        return self

    async def to_list(self, length: int):
        result = list(self.data)
        if self._sort:
            key, direction = self._sort
            reverse = direction == -1
            # Handle sorting with missing keys
            result.sort(key=lambda x: x.get(key) if x.get(key) is not None else "", reverse=reverse)
        return result[:length]

class MockCollection:
    def __init__(self, name, db_data):
        self.name = name
        self.db_data = db_data
        if name not in self.db_data:
            self.db_data[name] = []

    async def find_one(self, filter: Dict[str, Any]):
        data = self.db_data[self.name]
        for item in data:
            if self._matches(item, filter):
                return copy.deepcopy(item)
        return None

    def find(self, filter: Dict[str, Any]):
        data = self.db_data[self.name]
        matches = [copy.deepcopy(item) for item in data if self._matches(item, filter)]
        return MockAsyncCursor(matches)

    async def insert_one(self, document: Dict[str, Any]):
        if "_id" not in document:
            document["_id"] = ObjectId()
        self.db_data[self.name].append(copy.deepcopy(document))
        return type('InsertOneResult', (), {'inserted_id': document["_id"]})()

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        data = self.db_data[self.name]
        found = False
        for item in data:
            if self._matches(item, filter):
                self._apply_update(item, update)
                found = True
                break
        
        if not found and upsert:
            new_doc = filter.copy()
            if "$setOnInsert" in update:
                new_doc.update(update["$setOnInsert"])
            self._apply_update(new_doc, update)
            if "_id" not in new_doc:
                new_doc["_id"] = ObjectId()
            self.db_data[self.name].append(new_doc)

    def _matches(self, item, filter):
        for key, value in filter.items():
            item_val = item.get(key)
            
            if isinstance(value, dict):
                # Handle simple operators
                if "$gte" in value:
                    if item_val is None or not (item_val >= value["$gte"]):
                        return False
                if "$lte" in value:
                    if item_val is None or not (item_val <= value["$lte"]):
                        return False
            elif item_val != value:
                return False
        return True

    def _apply_update(self, item, update):
        if "$set" in update:
            item.update(update["$set"])

class MockDB:
    # Static storage to persist across requests in the same process
    _storage = {}

    def __init__(self):
        pass

    def __getattr__(self, name):
        return MockCollection(name, self._storage)

class MockAdmin:
    async def command(self, cmd):
        return {"ok": 1.0}

class MockClient:
    def __init__(self, uri):
        logger.warning(f"Using MockClient for MongoDB at {uri}")
        self.db = MockDB()

    def get_default_database(self):
        return self.db
    
    def close(self):
        pass

    @property
    def admin(self):
        return MockAdmin()