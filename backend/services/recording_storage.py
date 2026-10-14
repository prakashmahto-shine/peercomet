"""
Private file storage for session recordings and resumes. Chosen with RECORDINGS_STORAGE:
  - local: directories on disk (RECORDINGS_DIR, RESUMES_DIR). In Docker/Kubernetes they
           must be on a persistent volume, otherwise files are lost when the container restarts.
  - s3:    any S3-compatible bucket (AWS S3, MinIO, ...), under S3_PREFIX / "resumes".
           Credentials come from the standard AWS environment/role.
Keys are relative paths like "sess-123.webm" or "u_abc/9f2c.pdf".
"""
from pathlib import Path
from typing import Optional

from backend.config import (
    RECORDINGS_DIR, RECORDINGS_STORAGE, RESUMES_DIR, S3_BUCKET, S3_ENDPOINT_URL, S3_PREFIX, S3_REGION,
)


class LocalFileStorage:
    kind = "local"

    def __init__(self, directory: Path):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)

    def path(self, key: str) -> Path:
        target = (self.directory / key).resolve()
        if self.directory.resolve() not in target.parents:
            raise ValueError("Invalid storage key")
        return target

    def save(self, key: str, data: bytes, content_type: str) -> int:
        target = self.path(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".part")
        tmp.write_bytes(data)
        tmp.replace(target)
        return len(data)

    def exists(self, key: str) -> bool:
        try:
            return self.path(key).is_file()
        except ValueError:
            return False

    def delete(self, key: str) -> None:
        try:
            self.path(key).unlink(missing_ok=True)
        except ValueError:
            pass


class S3FileStorage:
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

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=self._object_key(key))

    def presigned_url(self, key: str, expires_seconds: int = 900, download_name: Optional[str] = None) -> str:
        """Short-lived link for the browser to fetch the file directly from the bucket."""
        params = {"Bucket": self.bucket, "Key": self._object_key(key)}
        if download_name:
            params["ResponseContentDisposition"] = f'attachment; filename="{download_name}"'
        return self.client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires_seconds)


def _build(local_dir: Path, s3_prefix: str):
    if RECORDINGS_STORAGE == "s3":
        return S3FileStorage(S3_BUCKET, s3_prefix, S3_REGION, S3_ENDPOINT_URL)
    return LocalFileStorage(local_dir)


recording_storage = _build(RECORDINGS_DIR, S3_PREFIX)
resume_storage = _build(RESUMES_DIR, "resumes")
