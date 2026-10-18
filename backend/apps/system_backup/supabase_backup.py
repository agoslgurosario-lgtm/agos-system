import os
import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

BACKUPS_TO_KEEP = 25


def _get_backup_client():
    """S3 client for the backup storage (Backblaze B2). Separate from the
    Supabase client that services.py uses for report media."""
    return boto3.client(
        's3',
        endpoint_url=os.getenv('BACKUP_S3_ENDPOINT'),
        aws_access_key_id=os.getenv('BACKUP_S3_ACCESS_KEY'),
        aws_secret_access_key=os.getenv('BACKUP_S3_SECRET_KEY'),
        region_name=os.getenv('BACKUP_S3_REGION', 'us-west-004'),
        config=Config(
            request_checksum_calculation='when_required',
            response_checksum_validation='when_required',
        ),
    )


def _bucket():
    return os.getenv('BACKUP_S3_BUCKET', 'agos-backups')


def upload_backup_to_supabase(local_file_path: str, file_name: str):
    client = _get_backup_client()
    size_mb = os.path.getsize(local_file_path) / (1024 * 1024)
    logger.info("Uploading backup %s (%.1f MB) to bucket %s",
                file_name, size_mb, _bucket())
    try:
        client.upload_file(local_file_path, _bucket(), file_name)
    except Exception as e:
        cause = e.__cause__ or e.__context__
        if isinstance(cause, ClientError):
            meta = cause.response.get('ResponseMetadata', {})
            logger.error("Backup upload failed: size=%.1fMB status=%s response=%s",
                         size_mb, meta.get('HTTPStatusCode'), cause.response)
            raise RuntimeError(
                f"Upload failed (HTTP {meta.get('HTTPStatusCode')}, {size_mb:.1f} MB)"
            ) from e
        raise
    return file_name


def list_supabase_backups():
    client = _get_backup_client()
    response = client.list_objects_v2(Bucket=_bucket())
    entries = []
    for obj in response.get('Contents', []):
        key = obj['Key']
        if key.endswith('/'):
            continue
        entries.append({
            'file_name': key,
            'size_bytes': obj['Size'],
            'modified_at': obj['LastModified'].isoformat(),
        })
    entries.sort(key=lambda e: e['modified_at'], reverse=True)
    return entries


def download_backup_from_supabase(file_name: str, dest_path: str):
    client = _get_backup_client()
    client.download_file(_bucket(), file_name, dest_path)


# services.py imports this for the Supabase *media* bucket (report photos).
# It must keep pointing at Supabase, exactly as before.
def _get_s3_client():
    from django.conf import settings
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


def prune_old_backups(keep: int = BACKUPS_TO_KEEP):
    """Delete all but the newest `keep` backup zips. Only touches files named
    agos_backup_*.zip, so nothing else in the bucket is ever deleted."""
    client = _get_backup_client()
    paginator = client.get_paginator('list_objects_v2')
    backups = []
    for page in paginator.paginate(Bucket=_bucket()):
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.startswith('agos_backup_') and key.endswith('.zip'):
                backups.append((obj['LastModified'], key))

    backups.sort(reverse=True)  # newest first
    for _, key in backups[keep:]:
        client.delete_object(Bucket=_bucket(), Key=key)
        logger.info("Deleted old backup: %s", key)