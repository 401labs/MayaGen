# Changelog: Async Workers & Admin Queue Improvements

## 🚀 Enhancements

### Backend Refactoring (Async Workers)
-   **Parallel Processing**: Refactored the single `worker_loop` into three concurrent loops:
    -   `azure_worker_loop`: Dedicated to Azure Foundry image editing tasks.
    -   `comfy_worker_loop`: Handles ComfyUI image generation.
    -   `batch_manager_loop`: Manages batch job expansion and monitoring.
-   **Asynchronous Edit Endpoint**: Updated `POST /images/edit` to be fully asynchronous. It now queues the job with `JobStatus.QUEUED` and returns immediately, allowing the background worker to process it without blocking the API.
-   **Startup Hooks**: Updated `app/api/server.py` to initialize all worker loops on application startup.

### Admin Queue Improvements
-   **Pagination**: Added pagination support to the `GET /admin/queue` endpoint and the Admin Queue UI (`src/app/admin/queue/page.tsx`). Users can now navigate through large queues without performance issues.
-   **Accurate Stats**: Fixed a bug where queue statistics (Queued, Processing, Completed, Failed) were returning 0 due to Enum serialization mismatches. The API now returns correct counts with normalized keys.
-   **Job Visibility**: Ensured Image Edit jobs are correctly displayed in the queue with a distinct "Edit" badge.

### Frontend
-   **Polling Mechanism**: Updated the Image Edit page (`src/app/edit/page.tsx`) to poll for job completion instead of waiting synchronously, improving the user experience for long-running edits.
-   **Queue Monitor**: Added "Previous" and "Next" buttons to the Queue Monitor for easier navigation.

## 🐛 Bug Fixes
-   Fixed `ImportError` in `server.py` related to the old `worker_loop`.
-   Fixed "Zero Stats" issue in Admin Queue.
-   Resolved blocking issues during high-load image editing.
