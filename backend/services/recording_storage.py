"""
Where session recordings are stored. Chosen with RECORDINGS_STORAGE:
  - local: a directory (RECORDINGS_DIR). Fine for local dev; in Kubernetes it needs a
           persistent volume, otherwise recordings are lost when the pod restarts.
  - s3:    any S3-compatible bucket (AWS S3, MinIO, ...). Credentials come from the standard
           AWS environment/role (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, IRSA, instance role).
"""
from pathlib import Path
from typing import Optional

from backend.config import (
    RECORDINGS_DIR, RECORDINGS_STORAGE, S3_BUCKET, S3_ENDPOINT_URL, S3_PREFIX, S3_REGION,
)


class LocalRecordingStorage:
    kind = "local"

    def __init__(self, directory: Path):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)

    def path(self, key: str) -> Path:
        return self.directory / key

    def save(self, key: str, data: bytes, content_type: str) -> int:
        target = self.path(key)
        tmp = target.with_suffix(target.suffix + ".part")
        tmp.write_bytes(data)
        tmp.replace(target)
        return len(data)

    def exists(self, key: str) -> bool:
        return self.path(key).is_file()


class S3RecordingStorage:
    kind = "s3"

    def __init__(self, bucket: str, prefix: str, region: Optional[str], endpoint_url: Optional[str]):
        import boto3  # only needed when S3 storage is enabled

        if not bucket:
            raise RuntimeError("S3_BUCKET is required when RECORDINGS_STORAGE=s3")
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.client = boto3.client("s3", region_name=region or None, endpoint_url=endpoint_url or None)

    def _object_key(self, key: str) -> str:
        return f"{self.prefix}/{key}" if self.prefix else key

    def save(self, key: str, data: bytes, content_type: str) -> int:
        self.client.put_object(Bucket=self.bucket, Key=self._object_key(key), Body=data, ContentType=content_type)
        return len(data)

    def exists(self, key: str) -> bool:
        from botocore.exceptions import ClientError
        try:
            self.client.head_object(Bucket=self.bucket, Key=self._object_key(key))
            return True
        except ClientError:
            return False

    def presigned_url(self, key: str, expires_seconds: int = 900) -> str:
        """Short-lived link for the browser to stream the video directly from the bucket."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": self._object_key(key)},
            ExpiresIn=expires_seconds,
        )


def build_storage():
    if RECORDINGS_STORAGE == "s3":
        return S3RecordingStorage(S3_BUCKET, S3_PREFIX, S3_REGION, S3_ENDPOINT_URL)
    return LocalRecordingStorage(RECORDINGS_DIR)


recording_storage = build_storage()
