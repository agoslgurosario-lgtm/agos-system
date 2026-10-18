import logging
import boto3
from botocore.config import Config
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(
            # Don't send the new default CRC checksums; Supabase/S3-compatible
            # providers can reject them (boto3 >= 1.36)
            request_checksum_calculation='when_required',
            response_checksum_validation='when_required',
            s3={'addressing_style': 'path'},
        ),
    )


# Raise the multipart threshold so backups go up as a single PutObject
_SINGLE_UPLOAD = TransferConfig(multipart_threshold=1024 ** 3, use_threads=False)


def upload_backup_to_supabase(local_file_path: str, file_name: str):
    import os
    client = _get_s3_client()
    size_mb = os.path.getsize(local_file_path) / (1024 * 1024)
    logger.info("Uploading backup %s (%.1f MB) to bucket %s",
                file_name, size_mb, settings.SUPABASE_S3_BACKUP_BUCKET)
    try:
        with open(local_file_path, 'rb') as f:
            client.put_object(
                Bucket=settings.SUPABASE_S3_BACKUP_BUCKET,
                Key=file_name,
                Body=f,
                ContentType='application/zip',
            )
    except ClientError as e:
        meta = e.response.get('ResponseMetadata', {})
        logger.error(
            "Supabase upload failed: size=%.1fMB status=%s headers=%s body=%s",
            size_mb, meta.get('HTTPStatusCode'), meta.get('HTTPHeaders'), e.response,
        )
        raise RuntimeError(
            f"Upload failed (HTTP {meta.get('HTTPStatusCode')}, {size_mb:.1f} MB)"
        ) from e
    return file_name


def list_supabase_backups():
    client = _get_s3_client()
    response = client.list_objects_v2(Bucket=settings.SUPABASE_S3_BACKUP_BUCKET)
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
    client = _get_s3_client()
    client.download_file(settings.SUPABASE_S3_BACKUP_BUCKET, file_name, dest_path)