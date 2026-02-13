# Image Generation Workflows

This document details the lifecycle and data flow of image generation tasks within MayaGen.

## 1. Queue State Machine

Every generation task follows a strict state transition model.

```mermaid
stateDiagram-v2
    [*] --> QUEUED
    QUEUED --> PROCESSING: Worker Picks Up
    PROCESSING --> COMPLETED: Success
    PROCESSING --> FAILED: Error
    QUEUED --> CANCELLED: User Action
    PROCESSING --> CANCELLED: User Action
```

---

## 2. Text-to-Image Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    participant Worker
    participant Azure as Azure OpenAI

    User->>API: POST /api/v1/batch (Prompt, Count=5)
    API->>DB: Create BatchJob + 5 Images (Status=QUEUED)
    API-->>User: Return BatchID (200 OK)
    
    loop Polling
        Worker->>DB: Select * FROM Image WHERE status='QUEUED'
        alt Job Found
            Worker->>DB: Update Image -> PROCESSING
            Worker->>Azure: POST /dalle/generations
            Azure-->>Worker: Image URL
            Worker->>Worker: Download & Save to Disk
            Worker->>DB: Update Image -> COMPLETED
        end
    end

    loop Frontend Polling
        User->>API: GET /api/v1/batch/{id}
        API->>DB: Query Progress
        DB-->>API: Return Stats (3/5 Completed)
    end
```

### Detailed Steps

1.  **Submission**: User submits a batch request. The API validates the quota and prompt format.
2.  **Expansion**: If a template (`{{color}} car`) is used, the API expands it into multiple distinct prompts.
3.  **Persistence**: Records are created in PostgreSQL with `QUEUED` status.
4.  **Processing**: The background worker picks up jobs FIFO (First-In-First-Out).
5.  **Completion**: On success, the image is stored in `synthetic_dataset/{category}/`. On failure, the `error_message` is logged.

---

## 3. Image Editing Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    participant Worker
    participant Flux as Azure Flux API

    User->>API: POST /api/v1/edit-batch (OrigID, Variations)
    API->>DB: Verify OrigID Ownership
    API->>DB: Create EditBatch + Images (Status=QUEUED, Type=IMAGE_EDIT)
    
    loop Worker Loop
        Worker->>DB: Fetch QUEUED Edit Job
        
        alt Input Image Hosting
           Worker->>Flux: Upload Original Image / Provide URL
        end
        
        Worker->>Flux: Generate Variation (Prompt, Strength)
        Flux-->>Worker: Result URL
        Worker->>DB: Update -> COMPLETED
    end
```

### Key Differences from Text-to-Image

*   **Input Handling**: Requires an existing image. The worker must resolve the file path of the *original* image (`synthetic_dataset/...`) and provide it to the AI provider.
*   **Providers**: Uses **FLUX.1-Kontext-pro** (via Azure) instead of DALL-E 3.
*   **Masking**: Supports partial editing if a mask is provided (currently backend implementation pending for advanced storage).

---

## 4. Error Handling & Recovery

*   **Retry Logic**: The worker setup includes a `retry_failed_jobs.py` script that can reset `FAILED` jobs back to `QUEUED`.
*   **Timeouts**: If a worker crashes while `PROCESSING`, the job remains stuck. A cleanup task (on server restart) resets stuck `PROCESSING` jobs to `QUEUED`.
*   **Concurrency**: Multiple worker processes can run in parallel (configured via `run_server.py`), leveraging database row locking (if implemented) or atomic updates to prevent double-processing.
